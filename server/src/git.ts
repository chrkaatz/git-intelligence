import simpleGit from 'simple-git';
import { getCachedStats, setCachedStats } from './db';

export interface DeveloperAnalytics {
  authors: DeveloperAuthorStats[];
}

export interface DeveloperAuthorStats {
  name: string;
  email: string;
  commits: number;
  linesAdded: number;
  linesRemoved: number;
  netLines: number;
  firstCommit: string;
  lastCommit: string;
  percentage: string;
  activeTimeWindows: {
    hourOfDay: Record<number, number>;
    dayOfWeek: Record<number, number>;
  };
  signedCommits: number;
  signedCommitsPercentage: string;
}

interface AuthorStats {
  name: string;
  email: string;
  commits: number;
  firstCommit: Date;
  lastCommit: Date;
}

interface ActivityStats {
  hourOfDay: Record<number, number>;
  dayOfWeek: Record<number, number>;
  monthOfYear: Record<number, number>;
  year: Record<number, number>;
}

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

export async function getDeveloperAnalytics(repoPath: string, useCache: boolean = true) {
  console.log(`Calculating developer analytics for ${repoPath}`);
  const git = simpleGit(repoPath);

  try {
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      throw new Error('Not a git repository');
    }

    // Get all commits with basic info for total count
    const log = await git.log(['--all', '--date=iso']);
    const totalCommits = log.total;

    // Get numstat data with commit info
    // Format: commit_hash|author_name|author_email|date|gpg_status
    // Followed by numstat lines: added\tdeleted\tfile
    const numstatRaw = await git.raw(['log', '--all', '--numstat', '--pretty=format:%H|%an|%ae|%ad|%G?', '--date=iso']);

    const authors = new Map<string, {
      name: string;
      email: string;
      commits: number;
      linesAdded: number;
      linesRemoved: number;
      firstCommit: Date;
      lastCommit: Date;
      activeTimeWindows: {
        hourOfDay: Record<number, number>;
        dayOfWeek: Record<number, number>;
      };
      signedCommits: number;
    }>();

    const lines = numstatRaw.split('\n');
    let currentCommit: { authorName: string; authorEmail: string; date: Date; isSigned: boolean } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check if this is a commit header line (hash|name|email|date|gpg)
      // The format should be: 40-char hash, then |, then fields
      const commitMatch = line.match(/^([a-f0-9]{40})\|(.+)\|(.+)\|(.+)\|([UGBNX])$/);
      if (commitMatch) {
        const [, , authorName, authorEmail, dateStr, gpgStatus] = commitMatch;
        let date: Date;
        try {
          date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            // Try parsing ISO date without timezone
            date = new Date(dateStr.replace(' ', 'T'));
          }
        } catch {
          console.warn(`Failed to parse date: ${dateStr}`);
          continue;
        }
        const isSigned = gpgStatus === 'G' || gpgStatus === 'U'; // G = valid, U = valid but untrusted

        currentCommit = { authorName, authorEmail, date, isSigned };

        // Initialize author if needed
        if (!authors.has(authorName)) {
          authors.set(authorName, {
            name: authorName,
            email: authorEmail,
            commits: 0,
            linesAdded: 0,
            linesRemoved: 0,
            firstCommit: date,
            lastCommit: date,
            activeTimeWindows: {
              hourOfDay: {},
              dayOfWeek: {},
            },
            signedCommits: 0,
          });
        }

        const author = authors.get(authorName)!;
        author.commits++;
        if (date < author.firstCommit) author.firstCommit = date;
        if (date > author.lastCommit) author.lastCommit = date;
        if (isSigned) author.signedCommits++;

        // Track active time windows
        const hour = date.getHours();
        const dayOfWeek = date.getDay();
        author.activeTimeWindows.hourOfDay[hour] = (author.activeTimeWindows.hourOfDay[hour] || 0) + 1;
        author.activeTimeWindows.dayOfWeek[dayOfWeek] = (author.activeTimeWindows.dayOfWeek[dayOfWeek] || 0) + 1;

        continue;
      }

      // Check if this is a numstat line (added\tdeleted\tfile)
      // Format: number or "-" for binary files, tab, number or "-", tab, filename
      if (currentCommit && line.includes('\t')) {
        const numstatMatch = line.match(/^(\d+|-)\t(\d+|-)\t/);
        if (numstatMatch) {
          const parts = line.split('\t');
          if (parts.length >= 2) {
            const addedStr = parts[0];
            const deletedStr = parts[1];
            const added = addedStr === '-' ? 0 : parseInt(addedStr, 10) || 0;
            const deleted = deletedStr === '-' ? 0 : parseInt(deletedStr, 10) || 0;

            const author = authors.get(currentCommit.authorName);
            if (author) {
              author.linesAdded += added;
              author.linesRemoved += deleted;
            }
          }
        }
      }
    }

    // Convert to array and format
    const authorList: DeveloperAuthorStats[] = Array.from(authors.values())
      .map(a => ({
        name: a.name,
        email: a.email,
        commits: a.commits,
        linesAdded: a.linesAdded,
        linesRemoved: a.linesRemoved,
        netLines: a.linesAdded - a.linesRemoved,
        firstCommit: a.firstCommit.toISOString(),
        lastCommit: a.lastCommit.toISOString(),
        percentage: totalCommits > 0 ? ((a.commits / totalCommits) * 100).toFixed(1) : '0.0',
        activeTimeWindows: a.activeTimeWindows,
        signedCommits: a.signedCommits,
        signedCommitsPercentage: a.commits > 0 ? ((a.signedCommits / a.commits) * 100).toFixed(1) : '0.0',
      }))
      .sort((a, b) => b.commits - a.commits);

    return {
      authors: authorList,
    };
  } catch (error) {
    console.error('Git analytics error:', error);
    throw error;
  }
}
