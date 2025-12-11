import simpleGit from 'simple-git';
import {
  getRepositories,
  getCachedDeveloperAnalytics,
  setCachedDeveloperAnalytics,
  getOllamaSettings,
} from '../db.js';
import type {
  DeveloperAnalytics,
  DeveloperAuthorStats,
  CrossRepoDeveloperAnalytics,
  CrossRepoDeveloperStats,
  AuthorData,
} from './types.js';
import {
  normalizeEmail,
  mergeAuthorsBySimilarity,
  calculateLongitudinalPatterns,
} from './utils.js';
import { generateInsights } from '../services/aiAnalysis.js';

export async function getDeveloperAnalytics(
  repoPath: string,
  useCache: boolean = true,
  includeAIInsights?: boolean
): Promise<DeveloperAnalytics> {
  // Check cache first
  if (useCache) {
    const cached = await getCachedDeveloperAnalytics(repoPath); // Uses default 30-day TTL as fallback
    if (cached) {
      // If AI insights are requested, generate them even for cached data
      if (includeAIInsights) {
        try {
          const ollamaSettings = await getOllamaSettings();
          if (ollamaSettings.enabled) {
            const insights = await generateInsights('developer-analytics', cached, ollamaSettings);
            return { ...cached, aiInsights: insights };
          }
        } catch (error) {
          // Log error but don't fail the entire request if AI insights fail
          console.warn('Failed to generate AI insights for developer analytics:', error);
        }
      }
      return cached;
    }
  }
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
    const numstatRaw = await git.raw([
      'log',
      '--all',
      '--numstat',
      '--pretty=format:%H|%an|%ae|%ad|%G?|%s',
      '--date=iso',
    ]);

    // Use email (normalized) as key to deduplicate authors with different names
    const authors = new Map<string, AuthorData>();

    // Track file first commits and churn
    // Map: file path -> { firstCommitDate: Date, firstAuthorEmail: string }
    const fileFirstCommits = new Map<string, { firstCommitDate: Date; firstAuthorEmail: string }>();
    // Map: author email -> { churnLines: number, totalLines: number }
    const authorChurn = new Map<string, { churnLines: number; totalLines: number }>();

    // Track all commits for longitudinal analysis
    const allCommits: Array<{ authorName: string; authorEmail: string; date: Date }> = [];

    const lines = numstatRaw.split('\n');
    let currentCommit: {
      authorName: string;
      authorEmail: string;
      date: Date;
      isSigned: boolean;
      message: string;
    } | null = null;

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
        author.activeTimeWindows.hourOfDay[hour] =
          (author.activeTimeWindows.hourOfDay[hour] || 0) + 1;
        author.activeTimeWindows.dayOfWeek[dayOfWeek] =
          (author.activeTimeWindows.dayOfWeek[dayOfWeek] || 0) + 1;

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
                const daysSinceFirstCommit =
                  (currentCommit.date.getTime() - fileFirstCommit.firstCommitDate.getTime()) /
                  (1000 * 60 * 60 * 24);
                const CHURN_WINDOW_DAYS = 30;

                // Always count as total lines
                churnData.totalLines += totalChanged;

                if (
                  daysSinceFirstCommit <= CHURN_WINDOW_DAYS &&
                  fileFirstCommit.firstAuthorEmail !== normalizedEmail
                ) {
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
      .map((a) => {
        const normalizedEmail = normalizeEmail(a.email);
        const churnData = authorChurn.get(normalizedEmail) || { churnLines: 0, totalLines: 0 };
        const churnRatio =
          churnData.totalLines > 0
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
          signedCommitsPercentage:
            a.commits > 0 ? ((a.signedCommits / a.commits) * 100).toFixed(1) : '0.0',
          fixCommits: a.fixCommits,
          fixCommitRatio: a.commits > 0 ? ((a.fixCommits / a.commits) * 100).toFixed(1) : '0.0',
          revertCommits: a.revertCommits,
          revertCommitRatio:
            a.commits > 0 ? ((a.revertCommits / a.commits) * 100).toFixed(1) : '0.0',
          churn: churnData.churnLines,
          churnRatio,
        };
      })
      .sort((a, b) => b.commits - a.commits);

    // Calculate longitudinal patterns (use merged authors)
    const longitudinalPatterns = calculateLongitudinalPatterns(mergedAuthors, allCommits);

    const result: DeveloperAnalytics = {
      authors: authorList,
      longitudinalPatterns,
    };

    // Generate AI insights if requested
    if (includeAIInsights) {
      try {
        const ollamaSettings = await getOllamaSettings();
        if (ollamaSettings.enabled) {
          const insights = await generateInsights('developer-analytics', result, ollamaSettings);
          result.aiInsights = insights;
        }
      } catch (error) {
        // Log error but don't fail the entire request if AI insights fail
        console.warn('Failed to generate AI insights for developer analytics:', error);
      }
    }

    // Cache the result (without AI insights to avoid caching them)
    if (useCache) {
      const resultToCache = { ...result };
      delete resultToCache.aiInsights;
      await setCachedDeveloperAnalytics(repoPath, resultToCache);
    }

    return result;
  } catch (error) {
    console.error('Git analytics error:', error);
    throw error;
  }
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
  const authorMap = new Map<
    string,
    {
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
      repoSpread: Map<
        string,
        {
          repoName: string;
          repoPath: string;
          commits: number;
          linesAdded: number;
          linesRemoved: number;
        }
      >;
    }
  >();

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
    .map((a) => {
      const repoSpreadArray = Array.from(a.repoSpread.values());
      const churnRatio =
        a.churnTotalLines > 0 ? ((a.churn / a.churnTotalLines) * 100).toFixed(1) : '0.0';

      return {
        name: a.name,
        email: a.email,
        commits: a.commits,
        linesAdded: a.linesAdded,
        linesRemoved: a.linesRemoved,
        netLines: a.netLines,
        firstCommit: a.firstCommit?.toISOString() || new Date().toISOString(),
        lastCommit: a.lastCommit?.toISOString() || new Date().toISOString(),
        percentage:
          totalCommitsAcrossRepos > 0
            ? ((a.commits / totalCommitsAcrossRepos) * 100).toFixed(1)
            : '0.0',
        activeTimeWindows: a.activeTimeWindows,
        signedCommits: a.signedCommits,
        signedCommitsPercentage:
          a.commits > 0 ? ((a.signedCommits / a.commits) * 100).toFixed(1) : '0.0',
        fixCommits: a.fixCommits,
        fixCommitRatio: a.commits > 0 ? ((a.fixCommits / a.commits) * 100).toFixed(1) : '0.0',
        revertCommits: a.revertCommits,
        revertCommitRatio: a.commits > 0 ? ((a.revertCommits / a.commits) * 100).toFixed(1) : '0.0',
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
    repoNames: repositories.map((r) => r.name),
  };
}
