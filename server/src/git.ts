import simpleGit from 'simple-git';
import { getCachedStats, setCachedStats, getCachedCodebaseHealth, setCachedCodebaseHealth, getRepositories, type Repository } from './db';

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
  fixCommits: number;
  fixCommitRatio: string;
  revertCommits: number;
  revertCommitRatio: string;
  churn: number;
  churnRatio: string;
}

export interface AuthorActivityOverTime {
  authorName: string;
  authorEmail: string;
  weeklyActivity: { week: string; commits: number }[];
  monthlyActivity: { month: string; commits: number }[];
}

export interface OnboardingData {
  date: string;
  newAuthors: number;
  authorNames: string[];
}

export interface DormancyData {
  authorName: string;
  authorEmail: string;
  firstCommit: string;
  lastCommit: string;
  daysSinceLastCommit: number;
  totalCommits: number;
  status: 'active' | 'dormant' | 'inactive';
}

export interface LongitudinalPatterns {
  authorActivityOverTime: AuthorActivityOverTime[];
  onboardingCurve: OnboardingData[];
  dormancyDetection: DormancyData[];
}

export interface DeveloperAnalytics {
  authors: DeveloperAuthorStats[];
  longitudinalPatterns?: LongitudinalPatterns;
}

export interface CrossRepoDeveloperStats extends DeveloperAuthorStats {
  repoSpread: {
    repoName: string;
    repoPath: string;
    commits: number;
    linesAdded: number;
    linesRemoved: number;
  }[];
  repoCount: number;
}

export interface CrossRepoDeveloperAnalytics {
  authors: CrossRepoDeveloperStats[];
  totalRepos: number;
  repoNames: string[];
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

    // Get numstat data with commit info including commit message
    // Format: commit_hash|author_name|author_email|date|gpg_status|message
    // Followed by numstat lines: added\tdeleted\tfile
    const numstatRaw = await git.raw(['log', '--all', '--numstat', '--pretty=format:%H|%an|%ae|%ad|%G?|%s', '--date=iso']);

    // Use email (normalized) as key to deduplicate authors with different names
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
      nameVariants: Map<string, number>; // Track name variants and their frequency
      emails: Set<string>; // Track all emails for this author
      fixCommits: number;
      revertCommits: number;
    }>();

    // Track file first commits and churn
    // Map: file path -> { firstCommitDate: Date, firstAuthorEmail: string }
    const fileFirstCommits = new Map<string, { firstCommitDate: Date; firstAuthorEmail: string }>();
    // Map: author email -> { churnLines: number, totalLines: number }
    const authorChurn = new Map<string, { churnLines: number; totalLines: number }>();

    // Track all commits for longitudinal analysis
    const allCommits: Array<{ authorName: string; authorEmail: string; date: Date }> = [];

    const lines = numstatRaw.split('\n');
    let currentCommit: { authorName: string; authorEmail: string; date: Date; isSigned: boolean; message: string } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check if this is a commit header line (hash|name|email|date|gpg|message)
      // The format should be: 40-char hash, then |, then fields
      const commitMatch = line.match(/^([a-f0-9]{40})\|(.+)\|(.+)\|(.+)\|([UGBNX])\|(.+)$/);
      if (commitMatch) {
        const [, , authorName, authorEmail, dateStr, gpgStatus, commitMessage] = commitMatch;
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

        currentCommit = { authorName, authorEmail, date, isSigned, message: commitMessage };

        // Track commit for longitudinal analysis
        allCommits.push({ authorName, authorEmail, date });

        // Normalize email for deduplication
        const normalizedEmail = normalizeEmail(authorEmail);

        if (!normalizedEmail) {
          console.warn(`Skipping commit with invalid email: ${authorEmail}`);
          continue;
        }

        // Initialize author if needed (key by normalized email)
        if (!authors.has(normalizedEmail)) {
          authors.set(normalizedEmail, {
            name: authorName,
            email: authorEmail, // Keep original email for display
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
            nameVariants: new Map(),
            emails: new Set([authorEmail]),
            fixCommits: 0,
            revertCommits: 0,
          });
        }

        const author = authors.get(normalizedEmail)!;

        // Check for fix commits (commits starting with "fix", "bug", "hotfix", etc.)
        const messageLower = commitMessage.toLowerCase();
        if (messageLower.match(/^(fix|bug|hotfix|patch|repair|resolve|correct)/)) {
          author.fixCommits++;
        }

        // Check for revert commits
        if (messageLower.match(/^(revert|undo|rollback)/)) {
          author.revertCommits++;
        }

        // Track name variants to use the most common one
        author.nameVariants.set(authorName, (author.nameVariants.get(authorName) || 0) + 1);
        // Update name to the most common variant
        let maxCount = 0;
        let mostCommonName = author.name;
        author.nameVariants.forEach((count, name) => {
          if (count > maxCount) {
            maxCount = count;
            mostCommonName = name;
          }
        });
        author.name = mostCommonName;

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
          if (parts.length >= 3) {
            const addedStr = parts[0];
            const deletedStr = parts[1];
            const filePath = parts[2];
            const added = addedStr === '-' ? 0 : parseInt(addedStr, 10) || 0;
            const deleted = deletedStr === '-' ? 0 : parseInt(deletedStr, 10) || 0;
            const totalChanged = added + deleted;

            // Use normalized email to find author
            const normalizedEmail = normalizeEmail(currentCommit.authorEmail);
            const author = authors.get(normalizedEmail);
            if (author) {
              author.linesAdded += added;
              author.linesRemoved += deleted;
            }

            // Track file first commits and churn
            if (filePath && totalChanged > 0) {
              const fileFirstCommit = fileFirstCommits.get(filePath);

              // Initialize churn tracking for this author
              if (!authorChurn.has(normalizedEmail)) {
                authorChurn.set(normalizedEmail, { churnLines: 0, totalLines: 0 });
              }
              const churnData = authorChurn.get(normalizedEmail)!;

              if (!fileFirstCommit) {
                // First time this file is seen - record it and count lines for creator
                fileFirstCommits.set(filePath, {
                  firstCommitDate: currentCommit.date,
                  firstAuthorEmail: normalizedEmail,
                });
                // Count as total lines for the creator (not churn)
                churnData.totalLines += totalChanged;
              } else {
                // File already exists - check for churn
                // Churn: lines modified within 30 days of first commit by a different author
                const daysSinceFirstCommit = (currentCommit.date.getTime() - fileFirstCommit.firstCommitDate.getTime()) / (1000 * 60 * 60 * 24);
                const CHURN_WINDOW_DAYS = 30;

                // Always count as total lines
                churnData.totalLines += totalChanged;

                if (daysSinceFirstCommit <= CHURN_WINDOW_DAYS && fileFirstCommit.firstAuthorEmail !== normalizedEmail) {
                  // This is churn - another author modifying the file shortly after it was created
                  churnData.churnLines += totalChanged;
                }
              }
            }
          }
        }
      }
    }

    // Merge authors by email and name similarity
    const mergedAuthors = mergeAuthorsBySimilarity(authors);

    // Convert to array and format
    const authorList: DeveloperAuthorStats[] = Array.from(mergedAuthors.values())
      .map(a => {
        const normalizedEmail = normalizeEmail(a.email);
        const churnData = authorChurn.get(normalizedEmail) || { churnLines: 0, totalLines: 0 };
        const churnRatio = churnData.totalLines > 0
          ? ((churnData.churnLines / churnData.totalLines) * 100).toFixed(1)
          : '0.0';

        return {
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
          fixCommits: a.fixCommits,
          fixCommitRatio: a.commits > 0 ? ((a.fixCommits / a.commits) * 100).toFixed(1) : '0.0',
          revertCommits: a.revertCommits,
          revertCommitRatio: a.commits > 0 ? ((a.revertCommits / a.commits) * 100).toFixed(1) : '0.0',
          churn: churnData.churnLines,
          churnRatio,
        };
      })
      .sort((a, b) => b.commits - a.commits);

    // Calculate longitudinal patterns (use merged authors)
    const longitudinalPatterns = calculateLongitudinalPatterns(mergedAuthors, allCommits);

    return {
      authors: authorList,
      longitudinalPatterns,
    };
  } catch (error) {
    console.error('Git analytics error:', error);
    throw error;
  }
}

// Helper function to format week string (YYYY-WW)
function formatWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

// Helper function to format month string (YYYY-MM)
function formatMonth(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

// Normalize email for deduplication
function normalizeEmail(email: string): string {
  if (!email) return '';
  // Convert to lowercase, trim, and remove any extra whitespace
  let normalized = email.toLowerCase().trim();
  // Remove common email aliases (e.g., user+alias@domain.com -> user@domain.com)
  // But keep the base email for matching
  // Remove dots before @ for Gmail-style emails (optional - might be too aggressive)
  // For now, just normalize case and whitespace
  return normalized;
}

// Calculate name similarity (Levenshtein distance normalized)
function nameSimilarity(name1: string, name2: string): number {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();

  if (n1 === n2) return 1.0;

  // Exact match after normalization
  const normalize = (s: string) => s.replace(/[^a-z0-9]/g, '').toLowerCase();
  if (normalize(n1) === normalize(n2)) return 0.95;

  // Check if one name contains the other
  if (n1.includes(n2) || n2.includes(n1)) {
    const shorter = Math.min(n1.length, n2.length);
    const longer = Math.max(n1.length, n2.length);
    return shorter / longer;
  }

  // Simple Levenshtein-like similarity
  const longer = n1.length > n2.length ? n1 : n2;
  const shorter = n1.length > n2.length ? n2 : n1;
  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(n1, n2);
  return 1 - (distance / longer.length);
}

// Simple Levenshtein distance calculation
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

type AuthorData = {
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
  nameVariants: Map<string, number>;
  emails: Set<string>; // Track all emails for this author
  fixCommits: number;
  revertCommits: number;
};

// Merge authors by email and name similarity
function mergeAuthorsBySimilarity(
  authors: Map<string, AuthorData>
): Map<string, AuthorData> {
  const merged = new Map<string, typeof authors extends Map<string, infer V> ? V : never>();
  const SIMILARITY_THRESHOLD = 0.85; // 85% similarity to consider as same person

  // First pass: merge by normalized email
  const emailMap = new Map<string, string>(); // normalized email -> canonical email key

  authors.forEach((author, emailKey) => {
    const normalizedEmail = normalizeEmail(author.email);

    if (!emailMap.has(normalizedEmail)) {
      emailMap.set(normalizedEmail, emailKey);
      // Ensure emails set exists (should already be set, but be safe)
      if (!author.emails) {
        author.emails = new Set([author.email]);
      }
      merged.set(emailKey, author);
    } else {
      // Merge with existing author
      const canonicalKey = emailMap.get(normalizedEmail)!;
      const existing = merged.get(canonicalKey)!;

        // Merge data
        existing.commits += author.commits;
        existing.linesAdded += author.linesAdded;
        existing.linesRemoved += author.linesRemoved;
        existing.signedCommits += author.signedCommits;
        existing.fixCommits += author.fixCommits;
        existing.revertCommits += author.revertCommits;
        if (author.firstCommit < existing.firstCommit) existing.firstCommit = author.firstCommit;
        if (author.lastCommit > existing.lastCommit) existing.lastCommit = author.lastCommit;

      // Merge name variants
      author.nameVariants.forEach((count, name) => {
        existing.nameVariants.set(name, (existing.nameVariants.get(name) || 0) + count);
      });

      // Update to most common name
      let maxCount = 0;
      let mostCommonName = existing.name;
      existing.nameVariants.forEach((count, name) => {
        if (count > maxCount) {
          maxCount = count;
          mostCommonName = name;
        }
      });
      existing.name = mostCommonName;

      // Merge active time windows
      Object.entries(author.activeTimeWindows.hourOfDay).forEach(([hour, count]) => {
        existing.activeTimeWindows.hourOfDay[parseInt(hour)] =
          (existing.activeTimeWindows.hourOfDay[parseInt(hour)] || 0) + count;
      });
      Object.entries(author.activeTimeWindows.dayOfWeek).forEach(([day, count]) => {
        existing.activeTimeWindows.dayOfWeek[parseInt(day)] =
          (existing.activeTimeWindows.dayOfWeek[parseInt(day)] || 0) + count;
      });

      // Track all emails
      if (!existing.emails) {
        existing.emails = new Set([existing.email]);
      }
      existing.emails.add(author.email);
      if (author.emails) {
        author.emails.forEach(email => existing.emails!.add(email));
      }
    }
  });

  // Second pass: merge by name similarity for different emails
  const authorArray = Array.from(merged.entries());
  const toRemove = new Set<string>();

  for (let i = 0; i < authorArray.length; i++) {
    if (toRemove.has(authorArray[i][0])) continue;

    const [key1, author1] = authorArray[i];
    const normalizedEmail1 = normalizeEmail(author1.email);

    for (let j = i + 1; j < authorArray.length; j++) {
      if (toRemove.has(authorArray[j][0])) continue;

      const [key2, author2] = authorArray[j];
      const normalizedEmail2 = normalizeEmail(author2.email);

      // Skip if already merged by email
      if (normalizedEmail1 === normalizedEmail2) continue;

      // Check name similarity
      const similarity = nameSimilarity(author1.name, author2.name);

      if (similarity >= SIMILARITY_THRESHOLD) {
        // Merge author2 into author1
        author1.commits += author2.commits;
        author1.linesAdded += author2.linesAdded;
        author1.linesRemoved += author2.linesRemoved;
        author1.signedCommits += author2.signedCommits;
        author1.fixCommits += author2.fixCommits;
        author1.revertCommits += author2.revertCommits;
        if (author2.firstCommit < author1.firstCommit) author1.firstCommit = author2.firstCommit;
        if (author2.lastCommit > author1.lastCommit) author1.lastCommit = author2.lastCommit;

        // Merge name variants
        author2.nameVariants.forEach((count, name) => {
          author1.nameVariants.set(name, (author1.nameVariants.get(name) || 0) + count);
        });

        // Update to most common name
        let maxCount = 0;
        let mostCommonName = author1.name;
        author1.nameVariants.forEach((count, name) => {
          if (count > maxCount) {
            maxCount = count;
            mostCommonName = name;
          }
        });
        author1.name = mostCommonName;

        // Merge active time windows
        Object.entries(author2.activeTimeWindows.hourOfDay).forEach(([hour, count]) => {
          author1.activeTimeWindows.hourOfDay[parseInt(hour)] =
            (author1.activeTimeWindows.hourOfDay[parseInt(hour)] || 0) + count;
        });
        Object.entries(author2.activeTimeWindows.dayOfWeek).forEach(([day, count]) => {
          author1.activeTimeWindows.dayOfWeek[parseInt(day)] =
            (author1.activeTimeWindows.dayOfWeek[parseInt(day)] || 0) + count;
        });

        // Track all emails
        if (!author1.emails) {
          author1.emails = new Set([author1.email]);
        }
        if (author2.emails) {
          author2.emails.forEach(email => author1.emails!.add(email));
        }
        author1.emails.add(author2.email);

        toRemove.add(key2);
      }
    }
  }

  // Remove merged authors
  toRemove.forEach(key => merged.delete(key));

  return merged;
}

function calculateLongitudinalPatterns(
  authors: Map<string, AuthorData>,
  allCommits: Array<{ authorName: string; authorEmail: string; date: Date }>
): LongitudinalPatterns {
  const now = new Date();
  const DORMANT_THRESHOLD_DAYS = 90; // 3 months
  const INACTIVE_THRESHOLD_DAYS = 365; // 1 year

  // 1. Author Activity Over Time
  const authorActivityMap = new Map<string, {
    weekly: Map<string, number>;
    monthly: Map<string, number>;
  }>();

  // Create a map from any email to the canonical author
  const emailToAuthor = new Map<string, AuthorData>();
  authors.forEach((author, normalizedEmail) => {
    // Map all known emails to this author
    author.emails.forEach(email => {
      emailToAuthor.set(normalizeEmail(email), author);
    });
    // Also map the normalized key
    emailToAuthor.set(normalizedEmail, author);
  });

  allCommits.forEach(commit => {
    const date = commit.date instanceof Date ? commit.date : new Date(commit.date);
    const normalizedEmail = normalizeEmail(commit.authorEmail);

    if (!normalizedEmail || isNaN(date.getTime())) {
      return; // Skip invalid commits
    }

    // Find the canonical author for this email
    const author = emailToAuthor.get(normalizedEmail);
    if (!author) return; // Skip if author not found (shouldn't happen)

    // Use author's canonical email as key
    const canonicalEmail = normalizeEmail(author.email);
    if (!authorActivityMap.has(canonicalEmail)) {
      authorActivityMap.set(canonicalEmail, {
        weekly: new Map(),
        monthly: new Map(),
      });
    }

    const activity = authorActivityMap.get(canonicalEmail)!;
    const week = formatWeek(date);
    const month = formatMonth(date);

    activity.weekly.set(week, (activity.weekly.get(week) || 0) + 1);
    activity.monthly.set(month, (activity.monthly.get(month) || 0) + 1);
  });

  const authorActivityOverTime: AuthorActivityOverTime[] = Array.from(authorActivityMap.entries())
    .map(([canonicalEmail, activity]) => {
      const author = emailToAuthor.get(canonicalEmail);
      if (!author) return null;

      const weeklyActivity = Array.from(activity.weekly.entries())
        .map(([week, commits]) => ({ week, commits }))
        .sort((a, b) => a.week.localeCompare(b.week));

      const monthlyActivity = Array.from(activity.monthly.entries())
        .map(([month, commits]) => ({ month, commits }))
        .sort((a, b) => a.month.localeCompare(b.month));

      return {
        authorName: author.name,
        authorEmail: author.email,
        weeklyActivity,
        monthlyActivity,
      };
    })
    .filter((item): item is AuthorActivityOverTime => item !== null);

  // 2. Onboarding Curve (when people first appear)
  // Group by month for onboarding curve
  const onboardingByMonth = new Map<string, { date: Date; authorNames: Set<string> }>();

  Array.from(authors.values()).forEach(author => {
    const month = formatMonth(author.firstCommit);
    if (!onboardingByMonth.has(month)) {
      onboardingByMonth.set(month, {
        date: author.firstCommit,
        authorNames: new Set(),
      });
    }
    onboardingByMonth.get(month)!.authorNames.add(author.name);
  });

  const onboardingCurve: OnboardingData[] = Array.from(onboardingByMonth.entries())
    .map(([month, data]) => ({
      date: month,
      newAuthors: data.authorNames.size,
      authorNames: Array.from(data.authorNames),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 3. Dormancy Detection
  const dormancyDetection: DormancyData[] = Array.from(authors.values())
    .map(author => {
      const daysSinceLastCommit = Math.floor(
        (now.getTime() - author.lastCommit.getTime()) / (1000 * 60 * 60 * 24)
      );

      let status: 'active' | 'dormant' | 'inactive';
      if (daysSinceLastCommit < DORMANT_THRESHOLD_DAYS) {
        status = 'active';
      } else if (daysSinceLastCommit < INACTIVE_THRESHOLD_DAYS) {
        status = 'dormant';
      } else {
        status = 'inactive';
      }

      return {
        authorName: author.name,
        authorEmail: author.email,
        firstCommit: author.firstCommit.toISOString(),
        lastCommit: author.lastCommit.toISOString(),
        daysSinceLastCommit,
        totalCommits: author.commits,
        status,
      };
    })
    .sort((a, b) => b.daysSinceLastCommit - a.daysSinceLastCommit);

  return {
    authorActivityOverTime,
    onboardingCurve,
    dormancyDetection,
  };
}

export async function getCrossRepoDeveloperAnalytics(
  projectId: string,
  useCache: boolean = true
): Promise<CrossRepoDeveloperAnalytics> {
  console.log(`Calculating cross-repo developer analytics for project ${projectId}`);

  // Get all repositories for this project
  const repositories = await getRepositories(projectId);

  if (repositories.length === 0) {
    return {
      authors: [],
      totalRepos: 0,
      repoNames: [],
    };
  }

  // Aggregate analytics across all repositories
  const authorMap = new Map<string, {
    name: string;
    email: string;
    commits: number;
    linesAdded: number;
    linesRemoved: number;
    netLines: number;
    firstCommit: Date | null;
    lastCommit: Date | null;
    activeTimeWindows: {
      hourOfDay: Record<number, number>;
      dayOfWeek: Record<number, number>;
    };
    signedCommits: number;
    fixCommits: number;
    revertCommits: number;
    churn: number;
    churnTotalLines: number;
    repoSpread: Map<string, {
      repoName: string;
      repoPath: string;
      commits: number;
      linesAdded: number;
      linesRemoved: number;
    }>;
  }>();

  let totalCommitsAcrossRepos = 0;

  // Process each repository
  for (const repo of repositories) {
    try {
      const analytics = await getDeveloperAnalytics(repo.path, useCache);

      for (const author of analytics.authors) {
        const normalizedEmail = normalizeEmail(author.email);

        if (!authorMap.has(normalizedEmail)) {
          authorMap.set(normalizedEmail, {
            name: author.name,
            email: author.email,
            commits: 0,
            linesAdded: 0,
            linesRemoved: 0,
            netLines: 0,
            firstCommit: null,
            lastCommit: null,
            activeTimeWindows: {
              hourOfDay: {},
              dayOfWeek: {},
            },
            signedCommits: 0,
            fixCommits: 0,
            revertCommits: 0,
            churn: 0,
            churnTotalLines: 0,
            repoSpread: new Map(),
          });
        }

        const aggregated = authorMap.get(normalizedEmail)!;

        // Aggregate metrics
        aggregated.commits += author.commits;
        aggregated.linesAdded += author.linesAdded;
        aggregated.linesRemoved += author.linesRemoved;
        aggregated.netLines += author.netLines;
        aggregated.signedCommits += author.signedCommits;
        aggregated.fixCommits += author.fixCommits;
        aggregated.revertCommits += author.revertCommits;
        aggregated.churn += author.churn;

        // Parse churn ratio to get total lines
        const churnRatio = parseFloat(author.churnRatio);
        if (churnRatio > 0 && author.churn > 0) {
          aggregated.churnTotalLines += Math.round(author.churn / (churnRatio / 100));
        } else {
          aggregated.churnTotalLines += author.linesAdded + author.linesRemoved;
        }

        // Track first and last commits
        const firstCommit = new Date(author.firstCommit);
        const lastCommit = new Date(author.lastCommit);
        if (!aggregated.firstCommit || firstCommit < aggregated.firstCommit) {
          aggregated.firstCommit = firstCommit;
        }
        if (!aggregated.lastCommit || lastCommit > aggregated.lastCommit) {
          aggregated.lastCommit = lastCommit;
        }

        // Aggregate active time windows
        Object.entries(author.activeTimeWindows.hourOfDay).forEach(([hour, count]) => {
          aggregated.activeTimeWindows.hourOfDay[parseInt(hour)] =
            (aggregated.activeTimeWindows.hourOfDay[parseInt(hour)] || 0) + count;
        });
        Object.entries(author.activeTimeWindows.dayOfWeek).forEach(([day, count]) => {
          aggregated.activeTimeWindows.dayOfWeek[parseInt(day)] =
            (aggregated.activeTimeWindows.dayOfWeek[parseInt(day)] || 0) + count;
        });

        // Track repo spread
        if (!aggregated.repoSpread.has(repo.id)) {
          aggregated.repoSpread.set(repo.id, {
            repoName: repo.name,
            repoPath: repo.path,
            commits: 0,
            linesAdded: 0,
            linesRemoved: 0,
          });
        }
        const repoData = aggregated.repoSpread.get(repo.id)!;
        repoData.commits += author.commits;
        repoData.linesAdded += author.linesAdded;
        repoData.linesRemoved += author.linesRemoved;
      }

      totalCommitsAcrossRepos += analytics.authors.reduce((sum, a) => sum + a.commits, 0);
    } catch (error) {
      console.error(`Failed to analyze repository ${repo.path}:`, error);
      // Continue with other repositories
    }
  }

  // Convert to array and format
  const authors: CrossRepoDeveloperStats[] = Array.from(authorMap.values())
    .map(a => {
      const repoSpreadArray = Array.from(a.repoSpread.values());
      const churnRatio = a.churnTotalLines > 0
        ? ((a.churn / a.churnTotalLines) * 100).toFixed(1)
        : '0.0';

      return {
        name: a.name,
        email: a.email,
        commits: a.commits,
        linesAdded: a.linesAdded,
        linesRemoved: a.linesRemoved,
        netLines: a.netLines,
        firstCommit: a.firstCommit?.toISOString() || new Date().toISOString(),
        lastCommit: a.lastCommit?.toISOString() || new Date().toISOString(),
        percentage: totalCommitsAcrossRepos > 0
          ? ((a.commits / totalCommitsAcrossRepos) * 100).toFixed(1)
          : '0.0',
        activeTimeWindows: a.activeTimeWindows,
        signedCommits: a.signedCommits,
        signedCommitsPercentage: a.commits > 0
          ? ((a.signedCommits / a.commits) * 100).toFixed(1)
          : '0.0',
        fixCommits: a.fixCommits,
        fixCommitRatio: a.commits > 0
          ? ((a.fixCommits / a.commits) * 100).toFixed(1)
          : '0.0',
        revertCommits: a.revertCommits,
        revertCommitRatio: a.commits > 0
          ? ((a.revertCommits / a.commits) * 100).toFixed(1)
          : '0.0',
        churn: a.churn,
        churnRatio,
        repoSpread: repoSpreadArray.sort((a, b) => b.commits - a.commits),
        repoCount: repoSpreadArray.length,
      };
    })
    .sort((a, b) => b.commits - a.commits);

  return {
    authors,
    totalRepos: repositories.length,
    repoNames: repositories.map(r => r.name),
  };
}

export interface FileHotspot {
  file: string;
  commits: number;
}

export interface DirectoryHotspot {
  directory: string;
  commits: number;
}

export interface Hotspots {
  files: FileHotspot[];
  directories: DirectoryHotspot[];
}

export interface ChangeCouplingPair {
  file1: string;
  file2: string;
  coChanges: number;
  coChangePercentage: number;
}

export interface ChangeCoupling {
  pairs: ChangeCouplingPair[];
}

export interface StabilityFile {
  file: string;
  ageDays: number;
  changeFrequency: number;
  status: 'stable' | 'evolving' | 'unstable';
}

export interface Stability {
  files: StabilityFile[];
}

export interface ComplexityFile {
  file: string;
  averageDiffSize: number;
}

export interface LargestDiff {
  file: string;
  linesChanged: number;
  commitHash: string;
}

export interface MostRewritten {
  file: string;
  rewritePercentage: number;
  totalLines: number;
  rewrittenLines: number;
}

export interface Complexity {
  averageDiffSizes: ComplexityFile[];
  largestDiffs: LargestDiff[];
  mostRewritten: MostRewritten[];
}

export interface CodebaseHealth {
  hotspots: Hotspots;
  changeCoupling: ChangeCoupling;
  stability: Stability;
  complexity: Complexity;
}

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

export interface CrossRepoHotspot {
  repoName: string;
  repoPath: string;
  totalCommits: number;
  totalFiles: number;
  totalDirectories: number;
  topFiles: FileHotspot[];
  topDirectories: DirectoryHotspot[];
}

export interface CrossRepoCodebaseHealth {
  hotspots: {
    repositories: CrossRepoHotspot[];
    aggregatedFiles: FileHotspot[];
    aggregatedDirectories: DirectoryHotspot[];
  };
  totalRepos: number;
  repoNames: string[];
}

// Repository Evolution Analytics Interfaces
export interface CommitFrequency {
  date: string;
  commits: number;
}

export interface ReleaseInfo {
  tag: string;
  date: string;
  commitHash: string;
  message?: string;
}

export interface GrowthCurve {
  date: string;
  loc: number;
  files: number;
}

export interface ChangeBurst {
  date: string;
  commits: number;
  linesAdded: number;
  linesRemoved: number;
  netChange: number;
  isRefactor: boolean; // Large net-zero change
}

export interface ChurnMetrics {
  date: string;
  additions: number;
  deletions: number;
  netChange: number;
  churnRatio: number; // (additions + deletions) / max(additions, deletions)
}

export interface RepositoryEvolution {
  commitFrequency: CommitFrequency[];
  releases: ReleaseInfo[];
  growthCurve: GrowthCurve[];
  changeBursts: ChangeBurst[];
  churnMetrics: ChurnMetrics[];
  totalCommits: number;
  totalReleases: number;
  averageCommitsPerDay: number;
  averageChurnRatio: number;
  refactorCount: number;
}

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
        const tagInfo = await git.raw(['log', '-1', '--pretty=format:%H|%ad|%s', '--date=iso', tagName]);
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
          currentCommitFiles.forEach(f => {
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
          if (totalChange > 100) { // Threshold for burst
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
          currentLoc += (added - deleted);
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
      currentCommitFiles.forEach(f => {
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
    const averageChurnRatio = churnMetrics.length > 0
      ? churnMetrics.reduce((sum, c) => sum + c.churnRatio, 0) / churnMetrics.length
      : 0;
    const refactorCount = changeBursts.filter(b => b.isRefactor).length;

    return {
      commitFrequency,
      releases: releases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      growthCurve,
      changeBursts: changeBursts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
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

export interface CrossRepoRepositoryEvolution {
  repositories: {
    repoName: string;
    repoPath: string;
    evolution: RepositoryEvolution;
  }[];
  synchronization: {
    date: string;
    repos: string[];
    commitCounts: Record<string, number>;
  }[];
  totalRepos: number;
  repoNames: string[];
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
    repoNames: validEvolutions.map(r => r.repoName),
  };
}
