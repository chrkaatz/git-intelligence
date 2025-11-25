import simpleGit from 'simple-git';
import { getCachedStats, setCachedStats } from '../db';
import type { AuthorStats, ActivityStats } from './types';

export async function getStats(repoPath: string, useCache: boolean = true) {
  // Check cache first (default: 1 hour cache)
  if (useCache) {
    const cached = await getCachedStats(repoPath, 3600000); // 1 hour
    if (cached) {
      console.log(`Returning cached stats for ${repoPath}`);
      return cached;
    }
  }

  console.log(`Calculating fresh stats for ${repoPath}`);
  const git = simpleGit(repoPath);

  try {
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      throw new Error('Not a git repository');
    }

    const log = await git.log(['--all', '--stat', '--date=iso']);
    const totalCommits = log.total;

    const authors = new Map<string, AuthorStats>();
    const activity: ActivityStats = {
      hourOfDay: {},
      dayOfWeek: {},
      monthOfYear: {},
      year: {},
    };

    // Initialize activity counters
    for (let i = 0; i < 24; i++) activity.hourOfDay[i] = 0;
    for (let i = 0; i < 7; i++) activity.dayOfWeek[i] = 0;
    for (let i = 0; i < 12; i++) activity.monthOfYear[i] = 0;

    log.all.forEach(commit => {
      const date = new Date(commit.date);
      const authorName = commit.author_name;
      const authorEmail = commit.author_email;

      // Author Stats
      if (!authors.has(authorName)) {
        authors.set(authorName, {
          name: authorName,
          email: authorEmail,
          commits: 0,
          firstCommit: date,
          lastCommit: date
        });
      }

      const author = authors.get(authorName)!;
      author.commits++;
      if (date < author.firstCommit) author.firstCommit = date;
      if (date > author.lastCommit) author.lastCommit = date;

      // Activity Stats
      activity.hourOfDay[date.getHours()]++;
      activity.dayOfWeek[date.getDay()]++;
      activity.monthOfYear[date.getMonth()]++;

      const year = date.getFullYear();
      activity.year[year] = (activity.year[year] || 0) + 1;
    });

    const authorList = Array.from(authors.values()).map(a => ({
      ...a,
      percentage: ((a.commits / totalCommits) * 100).toFixed(1)
    })).sort((a, b) => b.commits - a.commits);

    // File extensions (HEAD)
    // This is a rough approximation using ls-files
    const files = await git.raw(['ls-files']);
    const extensions: Record<string, number> = {};
    files.split('\n').forEach(file => {
      if (!file) return;
      const ext = file.split('.').pop() || 'no-extension';
      extensions[ext] = (extensions[ext] || 0) + 1;
    });

    // LOC History
    // This is an approximation using numstat
    const locLog = await git.log(['--all', '--numstat', '--date=iso']);
    // The previous `locLog` variable was not used for its `all` property,
    // but rather for its `total` property, which is already captured by `totalCommits`.
    // The actual LOC history is derived from `rawLog` below.

    // Alternative efficient approach for LOC history:
    const rawLog = await git.raw(['log', '--all', '--pretty=tformat:%ad', '--date=iso', '--numstat']);
    const lines = rawLog.split('\n');
    const historyMap = new Map<string, number>();

    let currentLoc = 0;
    let currentDate = '';

    lines.forEach(line => {
      if (!line) return;

      // Date line
      if (line.match(/^\d{4}-\d{2}-\d{2}/)) {
        currentDate = line.split('T')[0];
        return;
      }

      // Numstat line: added deleted file
      const parts = line.split('\t');
      if (parts.length === 3) {
        const added = parseInt(parts[0]) || 0;
        const deleted = parseInt(parts[1]) || 0;
        currentLoc += (added - deleted);

        // Keep the last value for the day
        historyMap.set(currentDate, currentLoc);
      }
    });

    const sortedHistory = Array.from(historyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, loc]) => ({ date, loc }));

    // Ensure we don't have negative LOC (can happen with binary files or renames sometimes)
    const normalizedHistory = sortedHistory.map(h => ({ ...h, loc: Math.max(0, h.loc) }));

    const stats = {
      summary: {
        totalCommits,
        totalAuthors: authors.size,
        totalFiles: files.split('\n').length - 1, // -1 for empty line
      },
      authors: authorList,
      activity,
      extensions,
      locHistory: normalizedHistory
    };

    // Cache the results
    if (useCache) {
      await setCachedStats(repoPath, stats);
    }

    return stats;
  } catch (error) {
    console.error('Git error:', error);
    throw error;
  }
}

