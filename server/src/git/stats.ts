import simpleGit from 'simple-git';
import { getCachedStats, setCachedStats } from '../db.js';
import type { AuthorStats, ActivityStats } from './types.js';

export async function getStats(repoPath: string, useCache: boolean = true) {
  // Check cache first (default: 1 hour cache)
  if (useCache) {
    const cached = await getCachedStats(repoPath); // Uses default 30-day TTL as fallback
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

    log.all.forEach((commit) => {
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
          lastCommit: date,
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

    const authorList = Array.from(authors.values())
      .map((a) => ({
        ...a,
        percentage: ((a.commits / totalCommits) * 100).toFixed(1),
      }))
      .sort((a, b) => b.commits - a.commits);

    // File extensions (HEAD)
    // This is a rough approximation using ls-files
    const files = await git.raw(['ls-files']);
    const extensions: Record<string, number> = {};
    files.split('\n').forEach((file) => {
      if (!file) return;
      const ext = file.split('.').pop() || 'no-extension';
      extensions[ext] = (extensions[ext] || 0) + 1;
    });

    // LOC History
    // Calculate cumulative LOC over time using numstat
    // Process commits in reverse chronological order (oldest first) to build cumulative LOC
    const rawLog = await git.raw([
      'log',
      '--all',
      '--reverse', // Process from oldest to newest for cumulative calculation
      '--pretty=tformat:%ad',
      '--date=iso',
      '--numstat',
    ]);
    const lines = rawLog.split('\n');
    const historyMap = new Map<string, number>();

    let currentLoc = 0;
    let currentDate = '';
    let inCommit = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Empty line separates commits
      if (!trimmed) {
        inCommit = false;
        continue;
      }

      // Date line - marks the start of a new commit
      const dateMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        currentDate = dateMatch[1];
        inCommit = true;
        continue;
      }

      // Numstat line: added\tdeleted\tfile
      // Only process if we're in a commit (have a date)
      if (inCommit && currentDate && trimmed.includes('\t')) {
        const parts = trimmed.split('\t');
        if (parts.length >= 3) {
          const added = parseInt(parts[0], 10) || 0;
          const deleted = parseInt(parts[1], 10) || 0;
          const netChange = added - deleted;
          currentLoc += netChange;

          // Update the LOC for this date (keep the latest value for the day)
          // This handles multiple commits/files on the same day
          historyMap.set(currentDate, Math.max(0, currentLoc));
        }
      }
    }

    // If we have no history or the value seems too low, try to get current LOC directly
    const latestLoc =
      historyMap.size > 0 ? Array.from(historyMap.values())[historyMap.size - 1] : 0;

    // If latest LOC is suspiciously low (< 100) but we have significant commits, recalculate
    if (latestLoc < 100 && totalCommits > 10) {
      try {
        // Get actual current LOC by counting lines in tracked files
        const files = await git.raw(['ls-files']);
        const fileList = files.split('\n').filter((f) => f.trim() && !f.includes('=>'));

        if (fileList.length > 0) {
          let totalLoc = 0;
          const sampleSize = Math.min(1000, fileList.length);

          // Count lines in a sample of files
          for (const file of fileList.slice(0, sampleSize)) {
            try {
              const content = await git.raw(['show', `HEAD:${file}`]);
              const lineCount = content.split('\n').length;
              totalLoc += lineCount;
            } catch {
              // Skip files that can't be read (binary, deleted, etc.)
            }
          }

          // Extrapolate if we sampled
          if (sampleSize < fileList.length && totalLoc > 0) {
            totalLoc = Math.round((totalLoc / sampleSize) * fileList.length);
          }

          if (totalLoc > latestLoc) {
            // Use the actual count and update the latest date
            const today = new Date().toISOString().split('T')[0];
            historyMap.set(today, totalLoc);
          }
        }
      } catch (error) {
        console.warn('Failed to calculate actual LOC, using cumulative estimate:', error);
      }
    }

    const sortedHistory = Array.from(historyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, loc]) => ({ date, loc }));

    // Ensure we don't have negative LOC (can happen with binary files or renames sometimes)
    const normalizedHistory = sortedHistory.map((h) => ({ ...h, loc: Math.max(0, h.loc) }));

    const stats = {
      summary: {
        totalCommits,
        totalAuthors: authors.size,
        totalFiles: files.split('\n').length - 1, // -1 for empty line
      },
      authors: authorList,
      activity,
      extensions,
      locHistory: normalizedHistory,
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
