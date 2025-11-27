import simpleGit from 'simple-git';
import type {
  AuthorData,
  LongitudinalPatterns,
  AuthorActivityOverTime,
  OnboardingData,
  DormancyData,
} from './types.js';

// Helper function to format week string (YYYY-WW)
export function formatWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

// Helper function to format month string (YYYY-MM)
export function formatMonth(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

// Normalize email for deduplication
export function normalizeEmail(email: string): string {
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
export function nameSimilarity(name1: string, name2: string): number {
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
  return 1 - distance / longer.length;
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

// Merge authors by email and name similarity
export function mergeAuthorsBySimilarity(
  authors: Map<string, AuthorData>
): Map<string, AuthorData> {
  const merged = new Map<string, AuthorData>();
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
        author.emails.forEach((email) => existing.emails!.add(email));
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
          author2.emails.forEach((email) => author1.emails!.add(email));
        }
        author1.emails.add(author2.email);

        toRemove.add(key2);
      }
    }
  }

  // Remove merged authors
  toRemove.forEach((key) => merged.delete(key));

  return merged;
}

export function calculateLongitudinalPatterns(
  authors: Map<string, AuthorData>,
  allCommits: Array<{ authorName: string; authorEmail: string; date: Date }>
): LongitudinalPatterns {
  const now = new Date();
  const DORMANT_THRESHOLD_DAYS = 90; // 3 months
  const INACTIVE_THRESHOLD_DAYS = 365; // 1 year

  // 1. Author Activity Over Time
  const authorActivityMap = new Map<
    string,
    {
      weekly: Map<string, number>;
      monthly: Map<string, number>;
    }
  >();

  // Create a map from any email to the canonical author
  const emailToAuthor = new Map<string, AuthorData>();
  authors.forEach((author, normalizedEmail) => {
    // Map all known emails to this author
    author.emails.forEach((email) => {
      emailToAuthor.set(normalizeEmail(email), author);
    });
    // Also map the normalized key
    emailToAuthor.set(normalizedEmail, author);
  });

  allCommits.forEach((commit) => {
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

  Array.from(authors.values()).forEach((author) => {
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
    .map((author) => {
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

/**
 * Get the latest commit hash from a repository
 * Returns null if the repository is invalid or has no commits
 */
export async function getLatestCommitHash(repoPath: string): Promise<string | null> {
  try {
    const git = simpleGit(repoPath);
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      return null;
    }

    // Get the latest commit hash (all branches)
    const latestCommit = await git.raw(['log', '--all', '-1', '--format=%H']);
    return latestCommit.trim() || null;
  } catch (error) {
    console.error(`Error getting latest commit hash for ${repoPath}:`, error);
    return null;
  }
}
