import simpleGit from 'simple-git';
import { getRepositories } from '../db';
import type {
  RepositoryEvolution,
  CommitFrequency,
  ReleaseInfo,
  GrowthCurve,
  ChangeBurst,
  ChurnMetrics,
  CrossRepoRepositoryEvolution,
} from './types';

export async function getRepositoryEvolution(
  repoPath: string,
  useCache: boolean = true
): Promise<RepositoryEvolution> {
  console.log(`Calculating repository evolution for ${repoPath}`);
  const git = simpleGit(repoPath);

  try {
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      throw new Error('Not a git repository');
    }

    // Get all commits with dates and numstat
    const numstatRaw = await git.raw([
      'log',
      '--all',
      '--numstat',
      '--pretty=format:%H|%ad|%s',
      '--date=iso',
    ]);

    // Get tags/releases
    // First get all tags
    const tagsList = await git.tags();
    const tags: ReleaseInfo[] = [];

    // For each tag, get its commit info
    for (const tagName of tagsList.all) {
      try {
        const tagInfo = await git.raw([
          'log',
          '-1',
          '--pretty=format:%H|%ad|%s',
          '--date=iso',
          tagName,
        ]);
        const parts = tagInfo.trim().split('|');
        if (parts.length >= 2) {
          const commitHash = parts[0];
          const dateStr = parts[1];
          const message = parts[2] || undefined;

          try {
            const tagDate = new Date(dateStr);
            if (!isNaN(tagDate.getTime())) {
              tags.push({
                tag: tagName,
                date: tagDate.toISOString(),
                commitHash,
                message,
              });
            }
          } catch {
            // Skip invalid dates
          }
        }
      } catch {
        // Skip tags that can't be processed
      }
    }

    // Parse commits and calculate metrics
    const commitFrequencyMap = new Map<string, number>();
    const growthCurveMap = new Map<string, { loc: number; files: Set<string> }>();
    const churnMetricsMap = new Map<string, { additions: number; deletions: number }>();
    const changeBursts: ChangeBurst[] = [];
    const releases: ReleaseInfo[] = tags; // Tags are already parsed above

    let currentLoc = 0;
    const allFiles = new Set<string>();
    const lines = numstatRaw.split('\n');
    let currentDate = '';
    let currentCommitHash = '';
    let currentCommitMessage = '';
    let currentCommitAdditions = 0;
    let currentCommitDeletions = 0;
    let currentCommitFiles = new Set<string>();

    // Parse commits
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check if this is a commit header line (hash|date|message)
      const commitMatch = line.match(/^([a-f0-9]{40})\|(.+?)\|(.+)$/);
      if (commitMatch) {
        // Process previous commit if exists
        if (currentDate && currentCommitHash) {
          const dateKey = currentDate.split('T')[0];

          // Update commit frequency
          commitFrequencyMap.set(dateKey, (commitFrequencyMap.get(dateKey) || 0) + 1);

          // Update growth curve
          if (!growthCurveMap.has(dateKey)) {
            growthCurveMap.set(dateKey, { loc: currentLoc, files: new Set(allFiles) });
          }
          const growth = growthCurveMap.get(dateKey)!;
          growth.loc = currentLoc;
          currentCommitFiles.forEach((f) => {
            allFiles.add(f);
            growth.files.add(f);
          });

          // Update churn metrics
          if (!churnMetricsMap.has(dateKey)) {
            churnMetricsMap.set(dateKey, { additions: 0, deletions: 0 });
          }
          const churn = churnMetricsMap.get(dateKey)!;
          churn.additions += currentCommitAdditions;
          churn.deletions += currentCommitDeletions;

          // Detect change bursts (commits with significant changes)
          const totalChange = currentCommitAdditions + currentCommitDeletions;
          const netChange = currentCommitAdditions - currentCommitDeletions;
          if (totalChange > 100) {
            // Threshold for burst
            const isRefactor = Math.abs(netChange) < totalChange * 0.1; // Less than 10% net change
            changeBursts.push({
              date: currentDate,
              commits: 1,
              linesAdded: currentCommitAdditions,
              linesRemoved: currentCommitDeletions,
              netChange,
              isRefactor,
            });
          }
        }

        // Start new commit
        currentCommitHash = commitMatch[1];
        const dateStr = commitMatch[2];
        currentCommitMessage = commitMatch[3];
        currentCommitAdditions = 0;
        currentCommitDeletions = 0;
        currentCommitFiles = new Set<string>();

        try {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            currentDate = date.toISOString();
          }
        } catch {
          // Skip invalid dates
        }
        continue;
      }

      // Check if this is a numstat line (added\tdeleted\tfile)
      if (currentDate && line.includes('\t')) {
        const parts = line.split('\t');
        if (parts.length >= 3) {
          const addedStr = parts[0];
          const deletedStr = parts[1];
          const filePath = parts.slice(2).join('\t');
          const added = addedStr === '-' ? 0 : parseInt(addedStr, 10) || 0;
          const deleted = deletedStr === '-' ? 0 : parseInt(deletedStr, 10) || 0;

          currentCommitAdditions += added;
          currentCommitDeletions += deleted;
          currentLoc += added - deleted;
          if (filePath) {
            currentCommitFiles.add(filePath);
          }
        }
      }
    }

    // Process last commit
    if (currentDate && currentCommitHash) {
      const dateKey = currentDate.split('T')[0];
      commitFrequencyMap.set(dateKey, (commitFrequencyMap.get(dateKey) || 0) + 1);

      if (!growthCurveMap.has(dateKey)) {
        growthCurveMap.set(dateKey, { loc: currentLoc, files: new Set(allFiles) });
      }
      const growth = growthCurveMap.get(dateKey)!;
      growth.loc = currentLoc;
      currentCommitFiles.forEach((f) => {
        allFiles.add(f);
        growth.files.add(f);
      });

      if (!churnMetricsMap.has(dateKey)) {
        churnMetricsMap.set(dateKey, { additions: 0, deletions: 0 });
      }
      const churn = churnMetricsMap.get(dateKey)!;
      churn.additions += currentCommitAdditions;
      churn.deletions += currentCommitDeletions;
    }

    // Convert maps to arrays and sort
    const commitFrequency: CommitFrequency[] = Array.from(commitFrequencyMap.entries())
      .map(([date, commits]) => ({ date, commits }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const growthCurve: GrowthCurve[] = Array.from(growthCurveMap.entries())
      .map(([date, data]) => ({ date, loc: Math.max(0, data.loc), files: data.files.size }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const churnMetrics: ChurnMetrics[] = Array.from(churnMetricsMap.entries())
      .map(([date, data]) => {
        const total = data.additions + data.deletions;
        const max = Math.max(data.additions, data.deletions);
        const churnRatio = max > 0 ? total / max : 0;
        return {
          date,
          additions: data.additions,
          deletions: data.deletions,
          netChange: data.additions - data.deletions,
          churnRatio,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate summary metrics
    const totalCommits = commitFrequency.reduce((sum, c) => sum + c.commits, 0);
    const totalDays = commitFrequency.length;
    const averageCommitsPerDay = totalDays > 0 ? totalCommits / totalDays : 0;
    const averageChurnRatio =
      churnMetrics.length > 0
        ? churnMetrics.reduce((sum, c) => sum + c.churnRatio, 0) / churnMetrics.length
        : 0;
    const refactorCount = changeBursts.filter((b) => b.isRefactor).length;

    return {
      commitFrequency,
      releases: releases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      growthCurve,
      changeBursts: changeBursts.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
      churnMetrics,
      totalCommits,
      totalReleases: releases.length,
      averageCommitsPerDay,
      averageChurnRatio,
      refactorCount,
    };
  } catch (error) {
    console.error('Repository evolution error:', error);
    throw error;
  }
}

export async function getCrossRepoRepositoryEvolution(
  projectId: string,
  useCache: boolean = true
): Promise<CrossRepoRepositoryEvolution> {
  console.log(`Calculating cross-repo repository evolution for project ${projectId}`);

  // Get all repositories for this project
  const repositories = await getRepositories(projectId);

  if (repositories.length === 0) {
    return {
      repositories: [],
      synchronization: [],
      totalRepos: 0,
      repoNames: [],
    };
  }

  // Calculate evolution for each repository
  const repoEvolutions = await Promise.all(
    repositories.map(async (repo) => {
      try {
        const evolution = await getRepositoryEvolution(repo.path, useCache);
        return {
          repoName: repo.name,
          repoPath: repo.path,
          evolution,
        };
      } catch (error) {
        console.error(`Failed to calculate evolution for ${repo.path}:`, error);
        return null;
      }
    })
  );

  const validEvolutions = repoEvolutions.filter((e): e is NonNullable<typeof e> => e !== null);

  // Calculate synchronization (which repos evolve in parallel)
  // Group commits by date across all repos
  const syncMap = new Map<string, { repos: Set<string>; commitCounts: Record<string, number> }>();

  validEvolutions.forEach(({ repoName, evolution }) => {
    evolution.commitFrequency.forEach(({ date, commits }) => {
      if (!syncMap.has(date)) {
        syncMap.set(date, { repos: new Set(), commitCounts: {} });
      }
      const sync = syncMap.get(date)!;
      sync.repos.add(repoName);
      sync.commitCounts[repoName] = (sync.commitCounts[repoName] || 0) + commits;
    });
  });

  // Convert to array and filter for dates with multiple repos
  const synchronization = Array.from(syncMap.entries())
    .filter(([_, data]) => data.repos.size > 1) // Only dates with multiple repos
    .map(([date, data]) => ({
      date,
      repos: Array.from(data.repos),
      commitCounts: data.commitCounts,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    repositories: validEvolutions,
    synchronization,
    totalRepos: validEvolutions.length,
    repoNames: validEvolutions.map((r) => r.repoName),
  };
}
