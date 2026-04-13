import simpleGit from 'simple-git';
import {
  getRepositories,
  getCachedAIInsights,
  setCachedAIInsights,
  clearCachedAIInsights,
  getOllamaSettings,
} from '../db.js';
import { getCachedReadinessDiagnostics, setCachedReadinessDiagnostics } from '../db/cache.js';
import { generateInsights } from '../services/aiAnalysis.js';
import type {
  ReadinessDiagnostics,
  ReadinessRankedPath,
  ReadinessContributor,
  ReadinessFirefightingCommit,
  CrossRepoReadinessDiagnostics,
} from './types.js';

const BUG_GREP = 'fix|bug|broken';
const FIRE_MSG = /revert|hotfix|emergency|rollback/i;
const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 30 * 6;

const STATIC_CAVEATS = [
  'Squash-merge workflows can make shortlog-style contributor counts reflect mergers more than authors.',
  'Bug-touch and firefighting signals depend on how consistently commit messages are written.',
];

function countPathsFromNameOnlyLog(raw: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const line of raw.split('\n')) {
    const path = line.trim();
    if (!path) continue;
    counts.set(path, (counts.get(path) || 0) + 1);
  }
  return counts;
}

function mapToRankedPaths(counts: Map<string, number>, limit: number): ReadinessRankedPath[] {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([path, touches], index) => ({ path, touches, rank: index + 1 }));
}

function mapToRankedContributorsFromCountMap(counts: Map<string, number>): ReadinessContributor[] {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, commits], index) => ({ name, commits, rank: index + 1 }));
}

function overlapPaths(
  churn: ReadinessRankedPath[],
  bugs: ReadinessRankedPath[],
  limit: number
): string[] {
  const bugSet = new Set(bugs.map((b) => b.path));
  const out: string[] = [];
  for (const c of churn) {
    if (bugSet.has(c.path)) {
      out.push(c.path);
      if (out.length >= limit) break;
    }
  }
  return out;
}

export async function getReadinessDiagnostics(
  repoPath: string,
  useCache: boolean = true,
  includeAIInsights?: boolean
): Promise<ReadinessDiagnostics> {
  if (!useCache) {
    await clearCachedAIInsights(repoPath, 'readiness-diagnostics');
  }

  if (useCache) {
    const cached = await getCachedReadinessDiagnostics(repoPath);
    if (cached) {
      if (includeAIInsights) {
        try {
          const ollamaSettings = await getOllamaSettings();
          if (ollamaSettings.enabled) {
            const cachedInsights = await getCachedAIInsights(repoPath, 'readiness-diagnostics');
            if (cachedInsights) {
              return { ...cached, aiInsights: cachedInsights };
            }
            const insights = await generateInsights(
              'readiness-diagnostics',
              cached,
              ollamaSettings
            );
            await setCachedAIInsights(repoPath, 'readiness-diagnostics', insights);
            return { ...cached, aiInsights: insights };
          }
        } catch (error) {
          console.warn('Failed to generate AI insights for readiness diagnostics:', error);
        }
      }
      return cached;
    }
  }

  const git = simpleGit(repoPath);
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    throw new Error('Not a git repository');
  }

  const churnRaw = await git.raw([
    'log',
    '--no-merges',
    '--format=format:',
    '--name-only',
    '--since',
    '1 year ago',
  ]);

  const bugRaw = await git.raw([
    'log',
    '--no-merges',
    '-i',
    '-E',
    '--grep',
    BUG_GREP,
    '--name-only',
    '--format=format:',
  ]);

  const contributorsAndMonthsRaw = await git.raw([
    'log',
    '--no-merges',
    '--pretty=format:%ad|%an',
    '--date=iso',
  ]);

  const fireRaw = await git.raw([
    'log',
    '--no-merges',
    '--since',
    '1 year ago',
    '--pretty=format:%H|%ad|%s',
    '--date=iso',
  ]);

  const churnCounts = countPathsFromNameOnlyLog(churnRaw);
  const topChurnFiles = mapToRankedPaths(churnCounts, 20);

  const bugCounts = countPathsFromNameOnlyLog(bugRaw);
  const bugFixTouchFiles = mapToRankedPaths(bugCounts, 20);

  const highRiskOverlap = overlapPaths(topChurnFiles, bugFixTouchFiles, 20);

  const allCounts = new Map<string, number>();
  const recentCounts = new Map<string, number>();
  const monthCounts = new Map<string, number>();
  const recentThreshold = Date.now() - SIX_MONTHS_MS;

  for (const line of contributorsAndMonthsRaw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const pipe = trimmed.indexOf('|');
    if (pipe === -1) continue;
    const dateStr = trimmed.slice(0, pipe);
    const author = trimmed.slice(pipe + 1).trim();
    if (!author) continue;

    allCounts.set(author, (allCounts.get(author) || 0) + 1);

    const commitDate = new Date(dateStr);
    if (!Number.isNaN(commitDate.getTime()) && commitDate.getTime() >= recentThreshold) {
      recentCounts.set(author, (recentCounts.get(author) || 0) + 1);
    }

    const month = dateStr.slice(0, 7);
    if (month.length === 7 && month[4] === '-') {
      monthCounts.set(month, (monthCounts.get(month) || 0) + 1);
    }
  }

  const contributorsAllTime = mapToRankedContributorsFromCountMap(allCounts);
  const contributorsRecent = mapToRankedContributorsFromCountMap(recentCounts);

  const totalShortlogCommits = Array.from(allCounts.values()).reduce((s, c) => s + c, 0);
  const topAll = contributorsAllTime[0];
  const dominantContributorSharePercent =
    totalShortlogCommits > 0 && topAll
      ? Math.round((topAll.commits / totalShortlogCommits) * 1000) / 10
      : 0;

  const recentNameSet = new Set(Array.from(recentCounts.keys()).map((name) => name.toLowerCase()));
  const topContributorInactiveRecently = Boolean(
    topAll && !recentNameSet.has(topAll.name.toLowerCase())
  );
  const commitsByMonth = Array.from(monthCounts.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const firefightingCommits: ReadinessFirefightingCommit[] = [];
  for (const line of fireRaw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const pipe = trimmed.indexOf('|');
    const pipe2 = trimmed.indexOf('|', pipe + 1);
    if (pipe === -1 || pipe2 === -1) continue;
    const hash = trimmed.slice(0, pipe);
    const date = trimmed.slice(pipe + 1, pipe2);
    const subject = trimmed.slice(pipe2 + 1);
    if (FIRE_MSG.test(subject)) {
      firefightingCommits.push({ hash, date, subject });
    }
  }

  const caveats = [...STATIC_CAVEATS];
  if (bugFixTouchFiles.length === 0) {
    caveats.push(
      'No commits matched bug-style grep (fix|bug|broken); churn-only view may be enough.'
    );
  }

  const result: ReadinessDiagnostics = {
    generatedAt: new Date().toISOString(),
    windows: {
      churnSince: '1 year ago',
      firefightingSince: '1 year ago',
      recentContributorsSince: '6 months ago',
    },
    topChurnFiles,
    bugFixTouchFiles,
    highRiskOverlap,
    contributorsAllTime,
    contributorsRecent,
    dominantContributorSharePercent,
    topContributorInactiveRecently,
    commitsByMonth,
    firefightingCommits,
    caveats,
  };

  if (includeAIInsights) {
    try {
      const ollamaSettings = await getOllamaSettings();
      if (ollamaSettings.enabled) {
        const cachedInsights = await getCachedAIInsights(repoPath, 'readiness-diagnostics');
        if (cachedInsights) {
          result.aiInsights = cachedInsights;
        } else {
          const insights = await generateInsights('readiness-diagnostics', result, ollamaSettings);
          result.aiInsights = insights;
          await setCachedAIInsights(repoPath, 'readiness-diagnostics', insights);
        }
      }
    } catch (error) {
      console.warn('Failed to generate AI insights for readiness diagnostics:', error);
    }
  }

  if (useCache) {
    const resultToCache = { ...result };
    delete resultToCache.aiInsights;
    await setCachedReadinessDiagnostics(repoPath, resultToCache);
  }

  return result;
}

export async function getCrossRepoReadinessDiagnostics(
  projectId: string,
  useCache: boolean = true,
  includeAIInsights?: boolean
): Promise<CrossRepoReadinessDiagnostics> {
  const repositories = await getRepositories(projectId);

  if (repositories.length === 0) {
    return {
      repositories: [],
      totalRepos: 0,
      repoNames: [],
      aggregatedCommitsByMonth: [],
      aggregatedContributors: [],
    };
  }

  const repoResults = await Promise.all(
    repositories.map(async (repo) => {
      try {
        const diagnostics = await getReadinessDiagnostics(repo.path, useCache);
        return { repoName: repo.name, repoPath: repo.path, diagnostics };
      } catch (error) {
        console.error(`Readiness diagnostics failed for ${repo.path}:`, error);
        return null;
      }
    })
  );

  const valid = repoResults.filter((r): r is NonNullable<typeof r> => r !== null);

  const monthMap = new Map<string, number>();
  for (const { diagnostics } of valid) {
    for (const { month, count } of diagnostics.commitsByMonth) {
      monthMap.set(month, (monthMap.get(month) || 0) + count);
    }
  }
  const aggregatedCommitsByMonth = Array.from(monthMap.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const contribMap = new Map<string, number>();
  for (const { diagnostics } of valid) {
    for (const c of diagnostics.contributorsAllTime) {
      contribMap.set(c.name, (contribMap.get(c.name) || 0) + c.commits);
    }
  }
  const aggregatedContributors = Array.from(contribMap.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 60)
    .map(([name, commits], index) => ({ name, commits, rank: index + 1 }));

  const result: CrossRepoReadinessDiagnostics = {
    repositories: valid,
    totalRepos: valid.length,
    repoNames: valid.map((r) => r.repoName),
    aggregatedCommitsByMonth,
    aggregatedContributors,
  };

  if (includeAIInsights) {
    try {
      const ollamaSettings = await getOllamaSettings();
      if (ollamaSettings.enabled) {
        const insights = await generateInsights(
          'cross-repo-readiness-diagnostics',
          result,
          ollamaSettings
        );
        result.aiInsights = insights;
      }
    } catch (error) {
      console.warn('Failed to generate AI insights for cross-repo readiness diagnostics:', error);
    }
  }

  return result;
}
