import simpleGit from 'simple-git';
import { getCachedCodebaseHealth, setCachedCodebaseHealth, getRepositories } from '../db';
import type {
  CodebaseHealth,
  FileHotspot,
  DirectoryHotspot,
  ChangeCouplingPair,
  StabilityFile,
  ComplexityFile,
  LargestDiff,
  MostRewritten,
  CrossRepoCodebaseHealth,
  CrossRepoHotspot,
} from './types';

export async function getCodebaseHealth(repoPath: string, useCache: boolean = true): Promise<CodebaseHealth> {
  // Check cache first (default: 1 hour cache)
  if (useCache) {
    const cached = await getCachedCodebaseHealth(repoPath, 3600000); // 1 hour
    if (cached) {
      console.log(`Returning cached codebase health for ${repoPath}`);
      return cached;
    }
  }

  console.log(`Calculating fresh codebase health for ${repoPath}`);
  const git = simpleGit(repoPath);

  try {
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      throw new Error('Not a git repository');
    }

    // Get all commits with numstat to track file changes
    const numstatRaw = await git.raw(['log', '--all', '--numstat', '--pretty=format:%H|%ad', '--date=iso']);

    // Track file commits and directories
    const fileCommits = new Map<string, number>();
    const directoryCommits = new Map<string, number>();
    const fileFirstSeen = new Map<string, Date>();
    const fileLastSeen = new Map<string, Date>();
    const fileChangeCount = new Map<string, number>();
    const fileDiffSizes = new Map<string, number[]>();
    const fileTotalLines = new Map<string, number>();
    const fileRewrittenLines = new Map<string, number>();
    const commitFiles = new Map<string, Set<string>>(); // commit hash -> files changed
    const fileLargestDiff = new Map<string, { lines: number; commitHash: string }>();

    const lines = numstatRaw.split('\n');
    let currentCommitHash = '';
    let currentDate: Date | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check if this is a commit header line (hash|date)
      const commitMatch = line.match(/^([a-f0-9]{40})\|(.+)$/);
      if (commitMatch) {
        const [, hash, dateStr] = commitMatch;
        currentCommitHash = hash;
        try {
          currentDate = new Date(dateStr);
          if (isNaN(currentDate.getTime())) {
            currentDate = new Date(dateStr.replace(' ', 'T'));
          }
        } catch {
          currentDate = new Date();
        }
        commitFiles.set(currentCommitHash, new Set());
        continue;
      }

      // Check if this is a numstat line (added\tdeleted\tfile)
      if (line.includes('\t') && currentCommitHash) {
        const parts = line.split('\t');
        if (parts.length >= 3) {
          const addedStr = parts[0];
          const deletedStr = parts[1];
          const filePath = parts.slice(2).join('\t'); // Handle filenames with tabs
          const added = addedStr === '-' ? 0 : parseInt(addedStr, 10) || 0;
          const deleted = deletedStr === '-' ? 0 : parseInt(deletedStr, 10) || 0;
          const totalChanged = added + deleted;

          if (filePath && totalChanged > 0) {
            // Track file commits
            fileCommits.set(filePath, (fileCommits.get(filePath) || 0) + 1);

            // Track directory commits
            const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
            if (dirPath) {
              directoryCommits.set(dirPath, (directoryCommits.get(dirPath) || 0) + 1);
            }

            // Track file age
            if (currentDate) {
              if (!fileFirstSeen.has(filePath) || currentDate < fileFirstSeen.get(filePath)!) {
                fileFirstSeen.set(filePath, currentDate);
              }
              if (!fileLastSeen.has(filePath) || currentDate > fileLastSeen.get(filePath)!) {
                fileLastSeen.set(filePath, currentDate);
              }
            }

            // Track change frequency
            fileChangeCount.set(filePath, (fileChangeCount.get(filePath) || 0) + 1);

            // Track diff sizes
            if (!fileDiffSizes.has(filePath)) {
              fileDiffSizes.set(filePath, []);
            }
            fileDiffSizes.get(filePath)!.push(totalChanged);

            // Track largest diff
            const currentLargest = fileLargestDiff.get(filePath);
            if (!currentLargest || totalChanged > currentLargest.lines) {
              fileLargestDiff.set(filePath, { lines: totalChanged, commitHash: currentCommitHash });
            }

            // Track rewritten lines (deletions + additions in same commit)
            if (added > 0 && deleted > 0) {
              const rewritten = Math.min(added, deleted);
              fileRewrittenLines.set(
                filePath,
                (fileRewrittenLines.get(filePath) || 0) + rewritten
              );
            }

            // Track total lines
            fileTotalLines.set(filePath, (fileTotalLines.get(filePath) || 0) + totalChanged);

            // Track files in commit for coupling analysis
            const commitFileSet = commitFiles.get(currentCommitHash);
            if (commitFileSet) {
              commitFileSet.add(filePath);
            }
          }
        }
      }
    }

    // 1. Hotspots
    const fileHotspots: FileHotspot[] = Array.from(fileCommits.entries())
      .map(([file, commits]) => ({ file, commits }))
      .sort((a, b) => b.commits - a.commits);

    const directoryHotspots: DirectoryHotspot[] = Array.from(directoryCommits.entries())
      .map(([directory, commits]) => ({ directory, commits }))
      .sort((a, b) => b.commits - a.commits);

    // 2. Change Coupling
    const filePairs = new Map<string, number>(); // "file1|file2" -> count
    const fileTotalCommits = new Map<string, number>(); // file -> total commits

    commitFiles.forEach((files, commitHash) => {
      const fileArray = Array.from(files);
      fileArray.forEach(file => {
        fileTotalCommits.set(file, (fileTotalCommits.get(file) || 0) + 1);
      });

      // Count pairs
      for (let i = 0; i < fileArray.length; i++) {
        for (let j = i + 1; j < fileArray.length; j++) {
          const file1 = fileArray[i];
          const file2 = fileArray[j];
          const pairKey = file1 < file2 ? `${file1}|${file2}` : `${file2}|${file1}`;
          filePairs.set(pairKey, (filePairs.get(pairKey) || 0) + 1);
        }
      }
    });

    const couplingPairs: ChangeCouplingPair[] = Array.from(filePairs.entries())
      .map(([pairKey, coChanges]) => {
        const [file1, file2] = pairKey.split('|');
        const file1Commits = fileTotalCommits.get(file1) || 1;
        const file2Commits = fileTotalCommits.get(file2) || 1;
        const minCommits = Math.min(file1Commits, file2Commits);
        const coChangePercentage = minCommits > 0 ? (coChanges / minCommits) * 100 : 0;

        return {
          file1,
          file2,
          coChanges,
          coChangePercentage,
        };
      })
      .filter(pair => pair.coChanges >= 3) // Only show pairs that changed together at least 3 times
      .sort((a, b) => b.coChanges - a.coChanges);

    // 3. Stability
    const now = new Date();
    const stabilityFiles: StabilityFile[] = Array.from(fileFirstSeen.keys())
      .map(file => {
        const firstSeen = fileFirstSeen.get(file)!;
        const lastSeen = fileLastSeen.get(file)!;
        const ageDays = Math.max(1, Math.floor((now.getTime() - firstSeen.getTime()) / (1000 * 60 * 60 * 24)));
        const changeFrequency = fileChangeCount.get(file) || 0;
        const changesPerDay = ageDays > 0 ? changeFrequency / ageDays : 0;

        let status: 'stable' | 'evolving' | 'unstable';
        if (ageDays < 90 && changeFrequency > 10) {
          status = 'unstable'; // High churn, low age
        } else if (ageDays > 365 && changeFrequency < 5) {
          status = 'stable'; // Low churn, high age
        } else {
          status = 'evolving'; // Moderate
        }

        return {
          file,
          ageDays,
          changeFrequency,
          status,
        };
      })
      .filter(f => f.changeFrequency > 0)
      .sort((a, b) => b.changeFrequency - a.changeFrequency);

    // 4. Complexity
    const averageDiffSizes: ComplexityFile[] = Array.from(fileDiffSizes.entries())
      .map(([file, sizes]) => {
        const average = sizes.reduce((sum, size) => sum + size, 0) / sizes.length;
        return {
          file,
          averageDiffSize: Math.round(average),
        };
      })
      .filter(f => f.averageDiffSize > 0)
      .sort((a, b) => b.averageDiffSize - a.averageDiffSize);

    const largestDiffs: LargestDiff[] = Array.from(fileLargestDiff.entries())
      .map(([file, data]) => ({
        file,
        linesChanged: data.lines,
        commitHash: data.commitHash,
      }))
      .sort((a, b) => b.linesChanged - a.linesChanged);

    const mostRewritten: MostRewritten[] = Array.from(fileRewrittenLines.entries())
      .map(([file, rewrittenLines]) => {
        const totalLines = fileTotalLines.get(file) || 1;
        const rewritePercentage = (rewrittenLines / totalLines) * 100;
        return {
          file,
          rewritePercentage,
          totalLines,
          rewrittenLines,
        };
      })
      .filter(f => f.rewrittenLines > 0 && f.totalLines > 100) // Only files with significant changes
      .sort((a, b) => b.rewritePercentage - a.rewritePercentage);

    const health = {
      hotspots: {
        files: fileHotspots,
        directories: directoryHotspots,
      },
      changeCoupling: {
        pairs: couplingPairs,
      },
      stability: {
        files: stabilityFiles,
      },
      complexity: {
        averageDiffSizes,
        largestDiffs,
        mostRewritten,
      },
    };

    // Cache the results
    if (useCache) {
      await setCachedCodebaseHealth(repoPath, health);
    }

    return health;
  } catch (error) {
    console.error('Codebase health error:', error);
    throw error;
  }
}

export async function getCrossRepoCodebaseHealth(
  projectId: string,
  useCache: boolean = true
): Promise<CrossRepoCodebaseHealth> {
  console.log(`Calculating cross-repo codebase health for project ${projectId}`);

  // Get all repositories for this project
  const repositories = await getRepositories(projectId);

  if (repositories.length === 0) {
    return {
      hotspots: {
        repositories: [],
        aggregatedFiles: [],
        aggregatedDirectories: [],
      },
      totalRepos: 0,
      repoNames: [],
    };
  }

  // Aggregate hotspots across all repositories
  const repoHotspots: CrossRepoHotspot[] = [];
  const aggregatedFileCommits = new Map<string, number>(); // file path -> total commits across all repos
  const aggregatedDirectoryCommits = new Map<string, number>(); // directory path -> total commits across all repos

  // Process each repository
  for (const repo of repositories) {
    try {
      const health = await getCodebaseHealth(repo.path, useCache);

      // Aggregate file commits (prefix with repo name to avoid collisions)
      health.hotspots.files.forEach(file => {
        const key = `${repo.name}:${file.file}`;
        aggregatedFileCommits.set(key, (aggregatedFileCommits.get(key) || 0) + file.commits);
      });

      // Aggregate directory commits
      health.hotspots.directories.forEach(dir => {
        const key = `${repo.name}:${dir.directory}`;
        aggregatedDirectoryCommits.set(key, (aggregatedDirectoryCommits.get(key) || 0) + dir.commits);
      });

      // Calculate totals for this repo
      const totalCommits = health.hotspots.files.reduce((sum, f) => sum + f.commits, 0);
      const totalFiles = health.hotspots.files.length;
      const totalDirectories = health.hotspots.directories.length;

      repoHotspots.push({
        repoName: repo.name,
        repoPath: repo.path,
        totalCommits,
        totalFiles,
        totalDirectories,
        topFiles: health.hotspots.files.slice(0, 10), // Top 10 files per repo
        topDirectories: health.hotspots.directories.slice(0, 10), // Top 10 directories per repo
      });
    } catch (error) {
      console.error(`Failed to analyze repository ${repo.path}:`, error);
      // Continue with other repositories
    }
  }

  // Sort repositories by total commits (most churn first)
  repoHotspots.sort((a, b) => b.totalCommits - a.totalCommits);

  // Create aggregated file and directory lists
  const aggregatedFiles: FileHotspot[] = Array.from(aggregatedFileCommits.entries())
    .map(([file, commits]) => ({ file, commits }))
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 50); // Top 50 files across all repos

  const aggregatedDirectories: DirectoryHotspot[] = Array.from(aggregatedDirectoryCommits.entries())
    .map(([directory, commits]) => ({ directory, commits }))
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 30); // Top 30 directories across all repos

  return {
    hotspots: {
      repositories: repoHotspots,
      aggregatedFiles,
      aggregatedDirectories,
    },
    totalRepos: repositories.length,
    repoNames: repositories.map(r => r.name),
  };
}

