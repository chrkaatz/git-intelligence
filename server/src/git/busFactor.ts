import simpleGit from 'simple-git';
import {
  getRepositories,
  getCachedBusFactorAndOwnership,
  setCachedBusFactorAndOwnership,
} from '../db.js';
import { normalizeEmail } from './utils.js';
import type {
  BusFactorAndOwnership,
  SingleMaintainerFile,
  FragmentedFile,
  OwnerChurn,
  CrossRepoBusFactorAndOwnership,
  SingleMaintainerRepo,
} from './types.js';

export async function getBusFactorAndOwnership(
  repoPath: string,
  useCache: boolean = true
): Promise<BusFactorAndOwnership> {
  // Check cache first
  if (useCache) {
    const cached = await getCachedBusFactorAndOwnership(repoPath); // Uses default 30-day TTL as fallback
    if (cached) {
      return cached;
    }
  }
  const git = simpleGit(repoPath);

  try {
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      throw new Error('Not a git repository');
    }

    // Get all commits with file changes and author info
    const numstatRaw = await git.raw([
      'log',
      '--all',
      '--numstat',
      '--pretty=format:%H|%an|%ae|%ad',
      '--date=iso',
    ]);

    // Track file ownership
    const fileAuthors = new Map<string, Map<string, number>>(); // file -> author email -> commit count
    const fileAuthorNames = new Map<string, Map<string, string>>(); // file -> author email -> author name
    const fileCommits = new Map<string, number>(); // file -> total commits
    const fileAuthorDates = new Map<string, Map<string, Date[]>>(); // file -> author email -> commit dates
    const repoAuthors = new Map<string, number>(); // author email -> commit count
    const repoAuthorNames = new Map<string, string>(); // author email -> author name
    let totalRepoCommits = 0;

    const lines = numstatRaw.split('\n');
    let currentCommit: {
      hash: string;
      authorName: string;
      authorEmail: string;
      date: Date;
    } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check if this is a commit header line (hash|name|email|date)
      const commitMatch = line.match(/^([a-f0-9]{40})\|(.+)\|(.+)\|(.+)$/);
      if (commitMatch) {
        const [, hash, authorName, authorEmail, dateStr] = commitMatch;
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            const dateFixed = new Date(dateStr.replace(' ', 'T'));
            if (isNaN(dateFixed.getTime())) continue;
            currentCommit = { hash, authorName, authorEmail, date: dateFixed };
          } else {
            currentCommit = { hash, authorName, authorEmail, date };
          }
        } catch {
          continue;
        }

        // Track repo-level author stats
        const normalizedEmail = normalizeEmail(authorEmail);
        repoAuthors.set(normalizedEmail, (repoAuthors.get(normalizedEmail) || 0) + 1);
        repoAuthorNames.set(normalizedEmail, authorName);
        totalRepoCommits++;

        continue;
      }

      // Check if this is a numstat line (added\tdeleted\tfile)
      if (currentCommit && line.includes('\t')) {
        const parts = line.split('\t');
        if (parts.length >= 3) {
          const filePath = parts.slice(2).join('\t');
          if (filePath) {
            const normalizedEmail = normalizeEmail(currentCommit.authorEmail);

            // Track file-level author stats
            if (!fileAuthors.has(filePath)) {
              fileAuthors.set(filePath, new Map());
              fileAuthorNames.set(filePath, new Map());
            }
            const authors = fileAuthors.get(filePath)!;
            authors.set(normalizedEmail, (authors.get(normalizedEmail) || 0) + 1);
            const authorNames = fileAuthorNames.get(filePath)!;
            authorNames.set(normalizedEmail, currentCommit.authorName);
            fileCommits.set(filePath, (fileCommits.get(filePath) || 0) + 1);

            // Track commit dates per author per file
            if (!fileAuthorDates.has(filePath)) {
              fileAuthorDates.set(filePath, new Map());
            }
            const authorDates = fileAuthorDates.get(filePath)!;
            if (!authorDates.has(normalizedEmail)) {
              authorDates.set(normalizedEmail, []);
            }
            authorDates.get(normalizedEmail)!.push(currentCommit.date);
          }
        }
      }
    }

    // 1. Single-maintainer risk (files)
    const SINGLE_MAINTAINER_THRESHOLD = 0.7; // 70% ownership = risk
    const singleMaintainerFiles: SingleMaintainerFile[] = [];

    fileAuthors.forEach((authors, file) => {
      const totalCommits = fileCommits.get(file) || 0;
      if (totalCommits < 3) return; // Skip files with too few commits

      let maxCommits = 0;
      let primaryAuthor = '';
      let primaryAuthorEmail = '';

      const authorNames = fileAuthorNames.get(file) || new Map();
      authors.forEach((commits, email) => {
        if (commits > maxCommits) {
          maxCommits = commits;
          primaryAuthorEmail = email;
          primaryAuthor = authorNames.get(email) || email.split('@')[0];
        }
      });

      const ownershipPercentage = (maxCommits / totalCommits) * 100;

      if (ownershipPercentage >= SINGLE_MAINTAINER_THRESHOLD * 100) {
        let riskLevel: 'low' | 'medium' | 'high';
        if (ownershipPercentage >= 90) {
          riskLevel = 'high';
        } else if (ownershipPercentage >= 80) {
          riskLevel = 'medium';
        } else {
          riskLevel = 'low';
        }

        singleMaintainerFiles.push({
          file,
          primaryAuthor,
          primaryAuthorEmail,
          primaryAuthorCommits: maxCommits,
          totalCommits,
          ownershipPercentage,
          riskLevel,
        });
      }
    });

    // Single-maintainer risk (repo level)
    let repoPrimaryAuthor = '';
    let repoPrimaryAuthorEmail = '';
    let repoPrimaryAuthorCommits = 0;
    repoAuthors.forEach((commits, email) => {
      if (commits > repoPrimaryAuthorCommits) {
        repoPrimaryAuthorCommits = commits;
        repoPrimaryAuthorEmail = email;
        repoPrimaryAuthor = repoAuthorNames.get(email) || email.split('@')[0];
      }
    });

    const repoOwnershipPercentage =
      totalRepoCommits > 0 ? (repoPrimaryAuthorCommits / totalRepoCommits) * 100 : 0;

    let repoRiskLevel: 'low' | 'medium' | 'high' = 'low';
    if (repoOwnershipPercentage >= 90) {
      repoRiskLevel = 'high';
    } else if (repoOwnershipPercentage >= 70) {
      repoRiskLevel = 'medium';
    }

    // 2. Fragmentation (too many authors for small files)
    const FRAGMENTATION_THRESHOLD = 5; // 5+ authors for a file is fragmented
    const MIN_COMMITS_FOR_FRAGMENTATION = 10; // Need at least 10 commits to consider fragmentation
    const fragmentedFiles: FragmentedFile[] = [];

    fileAuthors.forEach((authors, file) => {
      const totalCommits = fileCommits.get(file) || 0;
      const authorCount = authors.size;

      if (totalCommits >= MIN_COMMITS_FOR_FRAGMENTATION && authorCount >= FRAGMENTATION_THRESHOLD) {
        const averageCommitsPerAuthor = totalCommits / authorCount;

        let riskLevel: 'low' | 'medium' | 'high';
        if (authorCount >= 10) {
          riskLevel = 'high';
        } else if (authorCount >= 7) {
          riskLevel = 'medium';
        } else {
          riskLevel = 'low';
        }

        fragmentedFiles.push({
          file,
          authorCount,
          totalCommits,
          averageCommitsPerAuthor: Math.round(averageCommitsPerAuthor * 10) / 10,
          riskLevel,
        });
      }
    });

    // 3. Owner churn (old maintainer out, new maintainer in)
    const CHURN_WINDOW_DAYS = 180; // 6 months window to detect churn
    const ownerChurnFiles: OwnerChurn[] = [];

    fileAuthorDates.forEach((authorDates, file) => {
      if (authorDates.size < 2) return; // Need at least 2 authors

      // Find the previous owner (author with most commits before the transition)
      // and current owner (author with most recent commits)
      const authors = Array.from(authorDates.entries());
      const authorNames = fileAuthorNames.get(file) || new Map();

      // Sort authors by their last commit date
      authors.sort((a, b) => {
        const aLast = Math.max(...a[1].map((d) => d.getTime()));
        const bLast = Math.max(...b[1].map((d) => d.getTime()));
        return bLast - aLast;
      });

      if (authors.length < 2) return;

      const currentOwner = authors[0];
      const previousOwner = authors[1];

      const currentOwnerFirstCommit = Math.min(...currentOwner[1].map((d) => d.getTime()));
      const previousOwnerLastCommit = Math.max(...previousOwner[1].map((d) => d.getTime()));

      // Check if there's a significant gap indicating churn
      const daysSinceTransition =
        (currentOwnerFirstCommit - previousOwnerLastCommit) / (1000 * 60 * 60 * 24);

      if (daysSinceTransition > 0 && daysSinceTransition < CHURN_WINDOW_DAYS) {
        // Check if previous owner had significant ownership
        const previousOwnerCommits = fileAuthors.get(file)?.get(previousOwner[0]) || 0;
        const totalCommits = fileCommits.get(file) || 0;
        const previousOwnerPercentage = (previousOwnerCommits / totalCommits) * 100;

        if (previousOwnerPercentage >= 30) {
          // Previous owner had at least 30% ownership
          let riskLevel: 'low' | 'medium' | 'high';
          if (previousOwnerPercentage >= 70) {
            riskLevel = 'high';
          } else if (previousOwnerPercentage >= 50) {
            riskLevel = 'medium';
          } else {
            riskLevel = 'low';
          }

          ownerChurnFiles.push({
            file,
            previousOwner: authorNames.get(previousOwner[0]) || previousOwner[0].split('@')[0],
            previousOwnerEmail: previousOwner[0],
            previousOwnerLastCommit: new Date(previousOwnerLastCommit).toISOString(),
            currentOwner: authorNames.get(currentOwner[0]) || currentOwner[0].split('@')[0],
            currentOwnerEmail: currentOwner[0],
            currentOwnerFirstCommit: new Date(currentOwnerFirstCommit).toISOString(),
            daysSinceTransition: Math.round(daysSinceTransition),
            riskLevel,
          });
        }
      }
    });

    // Sort results
    singleMaintainerFiles.sort((a, b) => b.ownershipPercentage - a.ownershipPercentage);
    fragmentedFiles.sort((a, b) => b.authorCount - a.authorCount);
    ownerChurnFiles.sort((a, b) => b.daysSinceTransition - a.daysSinceTransition);

    const result: BusFactorAndOwnership = {
      singleMaintainerRisk: {
        files: singleMaintainerFiles,
        repoRisk: {
          primaryAuthor: repoPrimaryAuthor,
          primaryAuthorEmail: repoPrimaryAuthorEmail,
          primaryAuthorCommits: repoPrimaryAuthorCommits,
          totalCommits: totalRepoCommits,
          ownershipPercentage: Math.round(repoOwnershipPercentage * 10) / 10,
          riskLevel: repoRiskLevel,
        },
      },
      fragmentation: {
        files: fragmentedFiles,
      },
      ownerChurn: {
        files: ownerChurnFiles,
      },
    };

    // Cache the result
    if (useCache) {
      await setCachedBusFactorAndOwnership(repoPath, result);
    }

    return result;
  } catch (error) {
    console.error('Bus factor and ownership error:', error);
    throw error;
  }
}

export async function getCrossRepoBusFactorAndOwnership(
  projectId: string,
  useCache: boolean = true
): Promise<CrossRepoBusFactorAndOwnership> {
  console.log(`Calculating cross-repo bus factor and ownership for project ${projectId}`);

  // Get all repositories for this project
  const repositories = await getRepositories(projectId);

  if (repositories.length === 0) {
    return {
      singleMaintainerRisk: {
        repositories: [],
        aggregatedFiles: [],
      },
      fragmentation: {
        repositories: [],
        aggregatedFiles: [],
      },
      ownerChurn: {
        repositories: [],
        aggregatedFiles: [],
      },
      totalRepos: 0,
      repoNames: [],
    };
  }

  // Aggregate analytics across all repositories
  const repoSingleMaintainer: SingleMaintainerRepo[] = [];
  const aggregatedSingleMaintainerFiles = new Map<string, SingleMaintainerFile>(); // file key -> file data
  const repoFragmentation: Array<{
    repoName: string;
    repoPath: string;
    fragmentedFiles: FragmentedFile[];
  }> = [];
  const aggregatedFragmentedFiles = new Map<string, FragmentedFile>(); // file key -> file data
  const repoOwnerChurn: Array<{ repoName: string; repoPath: string; churnFiles: OwnerChurn[] }> =
    [];
  const aggregatedChurnFiles = new Map<string, OwnerChurn>(); // file key -> churn data

  // Process each repository
  for (const repo of repositories) {
    try {
      const analytics = await getBusFactorAndOwnership(repo.path, useCache);

      // Single-maintainer risk (repo level)
      if (analytics.singleMaintainerRisk.repoRisk) {
        repoSingleMaintainer.push({
          repoName: repo.name,
          repoPath: repo.path,
          ...analytics.singleMaintainerRisk.repoRisk,
        });
      }

      // Aggregate single-maintainer files (prefix with repo name)
      analytics.singleMaintainerRisk.files.forEach((file) => {
        const key = `${repo.name}:${file.file}`;
        if (
          !aggregatedSingleMaintainerFiles.has(key) ||
          file.ownershipPercentage > aggregatedSingleMaintainerFiles.get(key)!.ownershipPercentage
        ) {
          aggregatedSingleMaintainerFiles.set(key, {
            ...file,
            file: key,
          });
        }
      });

      // Fragmentation
      if (analytics.fragmentation.files.length > 0) {
        repoFragmentation.push({
          repoName: repo.name,
          repoPath: repo.path,
          fragmentedFiles: analytics.fragmentation.files,
        });
      }

      // Aggregate fragmented files
      analytics.fragmentation.files.forEach((file) => {
        const key = `${repo.name}:${file.file}`;
        if (
          !aggregatedFragmentedFiles.has(key) ||
          file.authorCount > aggregatedFragmentedFiles.get(key)!.authorCount
        ) {
          aggregatedFragmentedFiles.set(key, {
            ...file,
            file: key,
          });
        }
      });

      // Owner churn
      if (analytics.ownerChurn.files.length > 0) {
        repoOwnerChurn.push({
          repoName: repo.name,
          repoPath: repo.path,
          churnFiles: analytics.ownerChurn.files,
        });
      }

      // Aggregate churn files
      analytics.ownerChurn.files.forEach((file) => {
        const key = `${repo.name}:${file.file}`;
        if (
          !aggregatedChurnFiles.has(key) ||
          file.daysSinceTransition > aggregatedChurnFiles.get(key)!.daysSinceTransition
        ) {
          aggregatedChurnFiles.set(key, {
            ...file,
            file: key,
          });
        }
      });
    } catch (error) {
      console.error(`Failed to analyze repository ${repo.path}:`, error);
      // Continue with other repositories
    }
  }

  // Sort results
  repoSingleMaintainer.sort((a, b) => b.ownershipPercentage - a.ownershipPercentage);
  const aggregatedFiles = Array.from(aggregatedSingleMaintainerFiles.values()).sort(
    (a, b) => b.ownershipPercentage - a.ownershipPercentage
  );
  const aggregatedFragmented = Array.from(aggregatedFragmentedFiles.values()).sort(
    (a, b) => b.authorCount - a.authorCount
  );
  const aggregatedChurn = Array.from(aggregatedChurnFiles.values()).sort(
    (a, b) => b.daysSinceTransition - a.daysSinceTransition
  );

  return {
    singleMaintainerRisk: {
      repositories: repoSingleMaintainer,
      aggregatedFiles,
    },
    fragmentation: {
      repositories: repoFragmentation,
      aggregatedFiles: aggregatedFragmented,
    },
    ownerChurn: {
      repositories: repoOwnerChurn,
      aggregatedFiles: aggregatedChurn,
    },
    totalRepos: repositories.length,
    repoNames: repositories.map((r) => r.name),
  };
}
