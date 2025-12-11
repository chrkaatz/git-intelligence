import simpleGit from 'simple-git';
import {
  getRepositories,
  getCachedTechnicalDebtIndicators,
  setCachedTechnicalDebtIndicators,
  getCachedAIInsights,
  setCachedAIInsights,
  clearCachedAIInsights,
  getOllamaSettings,
} from '../db.js';
import { generateInsights } from '../services/aiAnalysis.js';
import fs from 'fs';
import path from 'path';
import type {
  TechnicalDebtIndicators,
  CrossRepoTechnicalDebtIndicators,
  CommentedOutCode,
  HugeCommit,
  WipCommit,
  QuickFixCommit,
  LargeBinaryFile,
  VendoredCodeGrowth,
  LongLivedBranch,
  DependencyBump,
  StaleDependency,
} from './types.js';

// Thresholds for risk levels
const HUGE_COMMIT_THRESHOLD = {
  LOW: 500, // lines changed
  MEDIUM: 1000,
  HIGH: 2000,
};

const LARGE_BINARY_THRESHOLD = {
  LOW: 1 * 1024 * 1024, // 1MB
  MEDIUM: 5 * 1024 * 1024, // 5MB
  HIGH: 10 * 1024 * 1024, // 10MB
};

const LONG_LIVED_BRANCH_THRESHOLD = {
  LOW: 30, // days
  MEDIUM: 90,
  HIGH: 180,
};

const STALE_DEPENDENCY_THRESHOLD = {
  LOW: 90, // days
  MEDIUM: 180,
  HIGH: 365,
};

const BRANCH_PROLIFERATION_THRESHOLD = {
  LOW: 10,
  MEDIUM: 20,
  HIGH: 50,
};

// WIP commit keywords
const WIP_KEYWORDS = [
  'wip',
  'work in progress',
  'work-in-progress',
  'draft',
  'todo',
  'fixme',
  'xxx',
  'hack',
  'temp',
  'temporary',
];

// Quick fix keywords
const QUICK_FIX_KEYWORDS = [
  'quick fix',
  'quickfix',
  'quick-fix',
  'temporary fix',
  'temp fix',
  'bandaid',
  'band-aid',
  'hotfix',
  'hot fix',
  'workaround',
  'work-around',
];

// Vendored code directories
const VENDORED_DIRS = [
  'vendor',
  'vendored',
  'third_party',
  'third-party',
  'libs',
  'external',
  'dependencies',
];

// Lockfile patterns
const LOCKFILE_PATTERNS = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'poetry.lock',
  'Pipfile.lock',
  'Gemfile.lock',
  'go.sum',
  'Cargo.lock',
  'composer.lock',
];

function getRiskLevel(
  value: number,
  thresholds: { LOW: number; MEDIUM: number; HIGH: number }
): 'low' | 'medium' | 'high' {
  if (value >= thresholds.HIGH) return 'high';
  if (value >= thresholds.MEDIUM) return 'medium';
  return 'low';
}

/**
 * Detect commented-out code in diffs
 * Optimized to process commits in batches and limit analysis
 */
async function detectCommentedOutCode(
  repoPath: string,
  git: ReturnType<typeof simpleGit>
): Promise<CommentedOutCode[]> {
  const commentedOut: CommentedOutCode[] = [];

  try {
    // Get recent commits only (last 100 commits) to avoid processing entire history
    // This is a reasonable limit for technical debt detection
    const logRaw = await git.raw([
      'log',
      '--all',
      '-100', // Limit to last 100 commits
      '--pretty=format:%H|%ad|%s',
      '--date=iso',
      '--numstat',
    ]);

    const lines = logRaw.split('\n');
    let currentCommit: { hash: string; date: string; message: string } | null = null;
    const commitFiles = new Map<string, string[]>(); // commit hash -> file paths

    // First pass: collect commits and their files
    for (const line of lines) {
      if (!line.trim()) continue;

      const commitMatch = line.match(/^([a-f0-9]{40})\|(.+)\|(.+)$/);
      if (commitMatch) {
        const [, hash, date, message] = commitMatch;
        currentCommit = { hash, date, message };
        commitFiles.set(hash, []);
        continue;
      }

      if (currentCommit && line.includes('\t')) {
        const parts = line.split('\t');
        if (parts.length >= 3) {
          const filePath = parts[2];
          if (filePath && !filePath.includes('=>')) {
            const files = commitFiles.get(currentCommit.hash) || [];
            files.push(filePath);
            commitFiles.set(currentCommit.hash, files);
          }
        }
      }
    }

    // Second pass: analyze diffs for commits with files (limit to avoid too many git commands)
    let processedCommits = 0;
    const maxCommitsToAnalyze = 50; // Limit to avoid timeout

    for (const [commitHash, files] of commitFiles.entries()) {
      if (processedCommits >= maxCommitsToAnalyze) break;
      if (files.length === 0) continue;

      const commitInfo = lines.find((l) => l.startsWith(commitHash));
      if (!commitInfo) continue;

      const [, , date] = commitInfo.split('|');

      try {
        // Get diff for entire commit (more efficient than per-file)
        const diffRaw = await git.raw(['show', '--format=', commitHash]);

        // Look for patterns indicating commented-out code in the diff
        const commentedPatterns = [
          /^[\+\-]\s*\/\/.*$/gm, // // comments
          /^[\+\-]\s*#.*$/gm, // # comments (but not in diff headers)
          /^[\+\-]\s*\/\*[\s\S]*?\*\/$/gm, // /* */ comments
          /^[\+\-]\s*<!--[\s\S]*?-->$/gm, // HTML comments
        ];

        const fileMatches = new Map<string, number>(); // file -> commented lines count

        for (const pattern of commentedPatterns) {
          const matches = diffRaw.matchAll(pattern);
          for (const match of matches) {
            // Try to find which file this belongs to by looking at the diff context
            const matchIndex = match.index || 0;
            const beforeMatch = diffRaw.substring(Math.max(0, matchIndex - 200), matchIndex);
            const fileMatch = beforeMatch.match(/^diff --git a\/(.+?) b\//m);
            if (fileMatch) {
              const filePath = fileMatch[1];
              fileMatches.set(filePath, (fileMatches.get(filePath) || 0) + 1);
            }
          }
        }

        // Add detected commented code
        for (const [filePath, commentedLines] of fileMatches.entries()) {
          if (commentedLines > 0 && commentedOut.length < 50) {
            commentedOut.push({
              file: filePath,
              commitHash,
              commitDate: date,
              linesCommented: commentedLines,
              riskLevel: getRiskLevel(commentedLines, { LOW: 5, MEDIUM: 10, HIGH: 20 }),
            });
          }
        }

        processedCommits++;
      } catch {
        // Skip commits that can't be analyzed
        continue;
      }
    }
  } catch (error) {
    console.error('[Technical Debt] Error detecting commented-out code:', error);
  }

  return commentedOut.slice(0, 50); // Limit to top 50
}

/**
 * Detect huge commits (large atomic changes)
 */
async function detectHugeCommits(
  repoPath: string,
  git: ReturnType<typeof simpleGit>
): Promise<HugeCommit[]> {
  const hugeCommits: HugeCommit[] = [];

  try {
    const logRaw = await git.raw([
      'log',
      '--all',
      '--pretty=format:%H|%ad|%an|%ae|%s',
      '--date=iso',
      '--numstat',
    ]);

    const lines = logRaw.split('\n');
    let currentCommit: {
      hash: string;
      date: string;
      author: string;
      authorEmail: string;
      message: string;
    } | null = null;
    let filesChanged = 0;
    let linesAdded = 0;
    let linesRemoved = 0;

    for (const line of lines) {
      if (!line.trim()) continue;

      const commitMatch = line.match(/^([a-f0-9]{40})\|(.+)\|(.+)\|(.+)\|(.+)$/);
      if (commitMatch) {
        // Process previous commit if exists
        if (currentCommit) {
          const totalChanges = linesAdded + linesRemoved;
          if (totalChanges >= HUGE_COMMIT_THRESHOLD.LOW) {
            hugeCommits.push({
              commitHash: currentCommit.hash,
              commitDate: currentCommit.date,
              author: currentCommit.author,
              authorEmail: currentCommit.authorEmail,
              message: currentCommit.message,
              filesChanged,
              linesAdded,
              linesRemoved,
              totalChanges,
              riskLevel: getRiskLevel(totalChanges, HUGE_COMMIT_THRESHOLD),
            });
          }
        }

        const [, hash, date, author, authorEmail, message] = commitMatch;
        currentCommit = { hash, date, author, authorEmail, message };
        filesChanged = 0;
        linesAdded = 0;
        linesRemoved = 0;
        continue;
      }

      if (line.includes('\t') && currentCommit) {
        const parts = line.split('\t');
        if (parts.length >= 2) {
          filesChanged++;
          const added = parseInt(parts[0], 10) || 0;
          const removed = parseInt(parts[1], 10) || 0;
          linesAdded += added;
          linesRemoved += removed;
        }
      }
    }

    // Process last commit
    if (currentCommit) {
      const totalChanges = linesAdded + linesRemoved;
      if (totalChanges >= HUGE_COMMIT_THRESHOLD.LOW) {
        hugeCommits.push({
          commitHash: currentCommit.hash,
          commitDate: currentCommit.date,
          author: currentCommit.author,
          authorEmail: currentCommit.authorEmail,
          message: currentCommit.message,
          filesChanged,
          linesAdded,
          linesRemoved,
          totalChanges,
          riskLevel: getRiskLevel(totalChanges, HUGE_COMMIT_THRESHOLD),
        });
      }
    }
  } catch (error) {
    console.error('Error detecting huge commits:', error);
  }

  return hugeCommits.sort((a, b) => b.totalChanges - a.totalChanges).slice(0, 50);
}

/**
 * Detect WIP commits
 */
async function detectWipCommits(
  repoPath: string,
  git: ReturnType<typeof simpleGit>
): Promise<WipCommit[]> {
  const wipCommits: WipCommit[] = [];

  try {
    const logRaw = await git.raw([
      'log',
      '--all',
      '--pretty=format:%H|%ad|%an|%ae|%s',
      '--date=iso',
    ]);

    const lines = logRaw.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;

      const commitMatch = line.match(/^([a-f0-9]{40})\|(.+)\|(.+)\|(.+)\|(.+)$/);
      if (commitMatch) {
        const [, hash, date, author, authorEmail, message] = commitMatch;
        const messageLower = message.toLowerCase();

        const foundKeywords: string[] = [];
        for (const keyword of WIP_KEYWORDS) {
          if (messageLower.includes(keyword)) {
            foundKeywords.push(keyword);
          }
        }

        if (foundKeywords.length > 0) {
          wipCommits.push({
            commitHash: hash,
            commitDate: date,
            author,
            authorEmail,
            message,
            wipKeywords: foundKeywords,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error detecting WIP commits:', error);
  }

  return wipCommits.slice(0, 100);
}

/**
 * Detect quick fix commits
 */
async function detectQuickFixCommits(
  repoPath: string,
  git: ReturnType<typeof simpleGit>
): Promise<QuickFixCommit[]> {
  const quickFixCommits: QuickFixCommit[] = [];

  try {
    const logRaw = await git.raw([
      'log',
      '--all',
      '--pretty=format:%H|%ad|%an|%ae|%s',
      '--date=iso',
    ]);

    const lines = logRaw.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;

      const commitMatch = line.match(/^([a-f0-9]{40})\|(.+)\|(.+)\|(.+)\|(.+)$/);
      if (commitMatch) {
        const [, hash, date, author, authorEmail, message] = commitMatch;
        const messageLower = message.toLowerCase();

        const foundKeywords: string[] = [];
        for (const keyword of QUICK_FIX_KEYWORDS) {
          if (messageLower.includes(keyword)) {
            foundKeywords.push(keyword);
          }
        }

        if (foundKeywords.length > 0) {
          quickFixCommits.push({
            commitHash: hash,
            commitDate: date,
            author,
            authorEmail,
            message,
            quickFixKeywords: foundKeywords,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error detecting quick fix commits:', error);
  }

  return quickFixCommits.slice(0, 100);
}

/**
 * Detect large binary files
 */
async function detectLargeBinaryFiles(
  repoPath: string,
  git: ReturnType<typeof simpleGit>
): Promise<LargeBinaryFile[]> {
  const largeBinaryFiles: LargeBinaryFile[] = [];

  try {
    // Get all files in the repository
    const filesRaw = await git.raw(['ls-files']);
    const files = filesRaw.split('\n').filter((f) => f.trim());

    for (const file of files) {
      const filePath = path.join(repoPath, file);
      try {
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          if (stats.isFile() && stats.size >= LARGE_BINARY_THRESHOLD.LOW) {
            // Check if it's likely a binary file
            const ext = path.extname(file).toLowerCase();
            const binaryExtensions = [
              '.jpg',
              '.jpeg',
              '.png',
              '.gif',
              '.pdf',
              '.zip',
              '.tar',
              '.gz',
              '.exe',
              '.dll',
              '.so',
              '.dylib',
              '.bin',
              '.dat',
            ];

            // Get when this file was added
            const logRaw = await git.raw([
              'log',
              '--diff-filter=A',
              '--format=%H|%ad',
              '--date=iso',
              '--',
              file,
            ]);
            const firstLine = logRaw.split('\n')[0];
            let commitHash = '';
            let commitDate = '';

            if (firstLine) {
              const match = firstLine.match(/^([a-f0-9]{40})\|(.+)$/);
              if (match) {
                commitHash = match[1];
                commitDate = match[2];
              }
            }

            if (binaryExtensions.includes(ext) || stats.size >= LARGE_BINARY_THRESHOLD.MEDIUM) {
              largeBinaryFiles.push({
                file,
                commitHash,
                commitDate,
                sizeBytes: stats.size,
                sizeMB: stats.size / (1024 * 1024),
                fileType: ext || 'unknown',
                riskLevel: getRiskLevel(stats.size, LARGE_BINARY_THRESHOLD),
              });
            }
          }
        }
      } catch {
        // Skip files that can't be accessed
        continue;
      }
    }
  } catch (error) {
    console.error('Error detecting large binary files:', error);
  }

  return largeBinaryFiles.sort((a, b) => b.sizeBytes - a.sizeBytes).slice(0, 50);
}

/**
 * Detect vendored code growth
 */
async function detectVendoredCodeGrowth(
  repoPath: string,
  git: ReturnType<typeof simpleGit>
): Promise<VendoredCodeGrowth[]> {
  const vendoredGrowth: VendoredCodeGrowth[] = [];

  try {
    // Find vendored directories
    const filesRaw = await git.raw(['ls-files']);
    const files = filesRaw.split('\n').filter((f) => f.trim());

    const vendoredDirs = new Set<string>();

    for (const file of files) {
      for (const vendoredDir of VENDORED_DIRS) {
        if (file.includes(`/${vendoredDir}/`) || file.startsWith(`${vendoredDir}/`)) {
          const dirPath =
            file.substring(0, file.indexOf(`/${vendoredDir}/`) + `/${vendoredDir}/`.length) ||
            file.substring(0, file.indexOf(`${vendoredDir}/`) + `${vendoredDir}/`.length);
          if (dirPath) {
            vendoredDirs.add(dirPath);
          }
        }
      }
    }

    for (const dir of vendoredDirs) {
      try {
        // Get initial size (first commit with this directory)
        const initialLog = await git.raw(['log', '--reverse', '--format=%H', '--', dir]);
        const initialCommits = initialLog.split('\n').filter((c) => c.trim());
        if (initialCommits.length === 0) continue;

        const initialCommit = initialCommits[0];
        const initialFiles = await git.raw([
          'ls-tree',
          '-r',
          '--name-only',
          initialCommit,
          '--',
          dir,
        ]);
        const initialFileCount = initialFiles.split('\n').filter((f) => f.trim()).length;

        // Get current size
        const currentFiles = await git.raw(['ls-tree', '-r', '--name-only', 'HEAD', '--', dir]);
        const currentFileCount = currentFiles.split('\n').filter((f) => f.trim()).length;

        if (currentFileCount > initialFileCount) {
          const growthPercentage = ((currentFileCount - initialFileCount) / initialFileCount) * 100;
          vendoredGrowth.push({
            directory: dir,
            initialSize: initialFileCount,
            currentSize: currentFileCount,
            growthPercentage,
            filesAdded: currentFileCount - initialFileCount,
            riskLevel: getRiskLevel(growthPercentage, { LOW: 50, MEDIUM: 100, HIGH: 200 }),
          });
        }
      } catch {
        continue;
      }
    }
  } catch (error) {
    console.error('Error detecting vendored code growth:', error);
  }

  return vendoredGrowth.sort((a, b) => b.growthPercentage - a.growthPercentage).slice(0, 20);
}

/**
 * Detect long-lived branches
 */
async function detectLongLivedBranches(
  repoPath: string,
  git: ReturnType<typeof simpleGit>
): Promise<LongLivedBranch[]> {
  const longLivedBranches: LongLivedBranch[] = [];
  const now = new Date();

  try {
    // Find default branch (main, master, or develop)
    const defaultBranches = ['main', 'master', 'develop'];
    let defaultBranch: string | null = null;
    for (const branch of defaultBranches) {
      try {
        await git.raw(['show-ref', '--verify', '--quiet', `refs/heads/${branch}`]);
        defaultBranch = branch;
        break;
      } catch {
        // Branch doesn't exist, try next
      }
    }

    if (!defaultBranch) {
      // If no default branch found, return empty
      return [];
    }

    // Get only local branches (not remotes)
    const branchesRaw = await git.raw([
      'for-each-ref',
      '--format=%(refname:short)|%(committerdate:iso)|%(objectname)',
      'refs/heads/',
    ]);

    const branches = branchesRaw
      .split('\n')
      .filter((line) => line.trim() && !line.includes('HEAD'));

    // Get merged branches
    const mergedBranches = new Set<string>();
    try {
      const mergedRaw = await git.raw(['branch', '--merged', defaultBranch]);
      const allMerged = mergedRaw
        .split('\n')
        .map((b) => b.trim().replace(/^\*\s*/, ''))
        .filter((b) => b && b !== defaultBranch);
      allMerged.forEach((b) => mergedBranches.add(b));
    } catch {
      // Ignore if can't determine merged branches
    }

    for (const branchLine of branches) {
      const parts = branchLine.split('|');
      if (parts.length >= 3) {
        const branchName = parts[0];
        const commitDateStr = parts[1];
        const commitHash = parts[2];

        // Skip default branches
        if (branchName === defaultBranch || defaultBranches.includes(branchName)) {
          continue;
        }

        try {
          const commitDate = new Date(commitDateStr);
          if (isNaN(commitDate.getTime())) continue;

          // Get branch creation date (first commit unique to this branch)
          // This finds the first commit on the branch that's not in the default branch
          let createdAt = commitDate;
          try {
            // Find merge base with default branch
            const mergeBaseRaw = await git.raw(['merge-base', defaultBranch, branchName]);
            const mergeBase = mergeBaseRaw.trim();

            if (mergeBase) {
              // Get first commit on branch after merge base
              const firstCommitRaw = await git.raw([
                'log',
                '--reverse',
                '--format=%ad',
                '--date=iso',
                `${mergeBase}..${branchName}`,
              ]);
              const firstCommitLines = firstCommitRaw.split('\n').filter((l) => l.trim());
              if (firstCommitLines.length > 0) {
                const firstCommitDate = new Date(firstCommitLines[0]);
                if (!isNaN(firstCommitDate.getTime())) {
                  createdAt = firstCommitDate;
                }
              }
            }
          } catch {
            // Fallback: use last commit date if we can't determine creation date
            createdAt = commitDate;
          }

          const daysSinceCreation = Math.floor(
            (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          const daysSinceLastCommit = Math.floor(
            (now.getTime() - commitDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Get commit count (commits unique to this branch)
          let commitCount = 0;
          try {
            const mergeBaseRaw = await git.raw(['merge-base', defaultBranch, branchName]);
            const mergeBase = mergeBaseRaw.trim();
            if (mergeBase) {
              const commitCountRaw = await git.raw([
                'rev-list',
                '--count',
                `${mergeBase}..${branchName}`,
              ]);
              commitCount = parseInt(commitCountRaw.trim(), 10) || 0;
            } else {
              const commitCountRaw = await git.raw(['rev-list', '--count', branchName]);
              commitCount = parseInt(commitCountRaw.trim(), 10) || 0;
            }
          } catch {
            // Fallback: count all commits on branch
            const commitCountRaw = await git.raw(['rev-list', '--count', branchName]);
            commitCount = parseInt(commitCountRaw.trim(), 10) || 0;
          }

          if (daysSinceCreation >= LONG_LIVED_BRANCH_THRESHOLD.LOW) {
            longLivedBranches.push({
              branchName,
              createdAt: createdAt.toISOString(),
              lastCommitDate: commitDate.toISOString(),
              daysSinceCreation,
              daysSinceLastCommit,
              commitCount,
              isMerged: mergedBranches.has(branchName),
              riskLevel: getRiskLevel(daysSinceCreation, LONG_LIVED_BRANCH_THRESHOLD),
            });
          }
        } catch {
          continue;
        }
      }
    }
  } catch (error) {
    console.error('Error detecting long-lived branches:', error);
  }

  return longLivedBranches.sort((a, b) => b.daysSinceCreation - a.daysSinceCreation).slice(0, 50);
}

/**
 * Analyze branch proliferation
 */
async function analyzeBranchProliferation(
  repoPath: string,
  git: ReturnType<typeof simpleGit>
): Promise<TechnicalDebtIndicators['branchProliferation']> {
  try {
    // Find default branch
    const defaultBranches = ['main', 'master', 'develop'];
    let defaultBranch: string | null = null;
    for (const branch of defaultBranches) {
      try {
        await git.raw(['show-ref', '--verify', '--quiet', `refs/heads/${branch}`]);
        defaultBranch = branch;
        break;
      } catch {
        // Branch doesn't exist, try next
      }
    }

    if (!defaultBranch) {
      return {
        totalBranches: 0,
        activeBranches: 0,
        mergedBranches: 0,
        unmergedBranches: 0,
        riskLevel: 'low',
      };
    }

    // Get only local branches (not remotes)
    const branchesRaw = await git.raw([
      'for-each-ref',
      '--format=%(refname:short)|%(committerdate:iso)',
      'refs/heads/',
    ]);

    const allBranches = branchesRaw
      .split('\n')
      .filter((line) => line.trim() && !line.includes('HEAD'))
      .map((line) => {
        const [name, dateStr] = line.split('|');
        return {
          name: name?.trim() || '',
          date: dateStr ? new Date(dateStr.trim()) : null,
        };
      })
      .filter((b) => b.name && b.date && !isNaN(b.date.getTime()))
      .filter((b) => b.name !== defaultBranch && !defaultBranches.includes(b.name)); // Exclude default branches

    const totalBranches = allBranches.length;

    // Get merged branches
    const mergedBranches = new Set<string>();
    try {
      const mergedRaw = await git.raw(['branch', '--merged', defaultBranch]);
      const allMerged = mergedRaw
        .split('\n')
        .map((b) => b.trim().replace(/^\*\s*/, ''))
        .filter((b) => b && b !== defaultBranch);
      allMerged.forEach((b) => mergedBranches.add(b));
    } catch {
      // Ignore if can't determine merged branches
    }

    const mergedCount = allBranches.filter((b) => mergedBranches.has(b.name)).length;
    const unmergedCount = totalBranches - mergedCount;

    // Active branches = branches with commits in last 90 days
    const now = new Date();
    const activeBranches = new Set<string>();
    for (const branch of allBranches) {
      if (branch.date) {
        const daysSince = Math.floor(
          (now.getTime() - branch.date.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSince <= 90) {
          activeBranches.add(branch.name);
        }
      }
    }

    return {
      totalBranches,
      activeBranches: activeBranches.size,
      mergedBranches: mergedCount,
      unmergedBranches: unmergedCount,
      riskLevel: getRiskLevel(totalBranches, BRANCH_PROLIFERATION_THRESHOLD),
    };
  } catch (error) {
    console.error('Error analyzing branch proliferation:', error);
    return {
      totalBranches: 0,
      activeBranches: 0,
      mergedBranches: 0,
      unmergedBranches: 0,
      riskLevel: 'low',
    };
  }
}

/**
 * Analyze dependency drift
 */
async function analyzeDependencyDrift(
  repoPath: string,
  git: ReturnType<typeof simpleGit>
): Promise<{
  lockfiles: string[];
  dependencyBumps: DependencyBump[];
  staleDependencies: StaleDependency[];
}> {
  const lockfiles: string[] = [];
  const dependencyBumps: DependencyBump[] = [];
  const staleDependencies: StaleDependency[] = [];
  const now = new Date();

  try {
    // Find lockfiles
    const filesRaw = await git.raw(['ls-files']);
    const files = filesRaw.split('\n').filter((f) => f.trim());

    for (const file of files) {
      const fileName = path.basename(file);
      if (LOCKFILE_PATTERNS.includes(fileName)) {
        lockfiles.push(file);

        // Check when lockfile was last updated
        const logRaw = await git.raw(['log', '-1', '--format=%H|%ad', '--date=iso', '--', file]);

        if (logRaw.trim()) {
          const [hash, date] = logRaw.trim().split('|');
          if (hash && date) {
            const lastUpdated = new Date(date);
            const daysSinceUpdate = Math.floor(
              (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysSinceUpdate >= STALE_DEPENDENCY_THRESHOLD.LOW) {
              staleDependencies.push({
                lockfile: file,
                lastUpdated: date,
                daysSinceUpdate,
                riskLevel: getRiskLevel(daysSinceUpdate, STALE_DEPENDENCY_THRESHOLD),
              });
            }

            // Analyze dependency changes in commits
            const changesRaw = await git.raw(['log', '--format=%H|%ad', '--date=iso', '--', file]);

            const changeLines = changesRaw.split('\n').filter((l) => l.trim());
            for (const changeLine of changeLines) {
              const [commitHash, commitDate] = changeLine.split('|');
              if (commitHash && commitDate) {
                try {
                  // Get diff stats for this commit
                  const diffRaw = await git.raw(['show', '--numstat', commitHash, '--', file]);
                  const diffLines = diffRaw.split('\n').filter((l) => l.trim() && l.includes('\t'));

                  let added = 0;
                  let removed = 0;
                  for (const diffLine of diffLines) {
                    const parts = diffLine.split('\t');
                    if (parts.length >= 2) {
                      added += parseInt(parts[0], 10) || 0;
                      removed += parseInt(parts[1], 10) || 0;
                    }
                  }

                  // Estimate dependency changes (rough heuristic)
                  const totalChanges = added + removed;
                  if (totalChanges > 10) {
                    // Estimate: each line might be a dependency
                    const dependenciesAdded = Math.floor(added / 2);
                    const dependenciesRemoved = Math.floor(removed / 2);
                    const dependenciesUpdated = Math.floor(totalChanges / 4);

                    dependencyBumps.push({
                      lockfile: file,
                      commitHash,
                      commitDate,
                      dependenciesAdded,
                      dependenciesRemoved,
                      dependenciesUpdated,
                      totalChanges,
                    });
                  }
                } catch {
                  continue;
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error analyzing dependency drift:', error);
  }

  return {
    lockfiles,
    dependencyBumps: dependencyBumps.slice(0, 50),
    staleDependencies,
  };
}

/**
 * Analyze missing automation
 */
async function analyzeMissingAutomation(
  repoPath: string
): Promise<TechnicalDebtIndicators['missingAutomation']> {
  const dependencyAutomationFiles: string[] = [];
  const cicdAutomationFiles: string[] = [];

  // Check for dependency automation
  const dependabotPath = path.join(repoPath, '.github', 'dependabot.yml');
  const renovatePath = path.join(repoPath, '.renovaterc.json');
  const renovatePath2 = path.join(repoPath, 'renovate.json');

  if (fs.existsSync(dependabotPath)) {
    dependencyAutomationFiles.push('.github/dependabot.yml');
  }
  if (fs.existsSync(renovatePath)) {
    dependencyAutomationFiles.push('.renovaterc.json');
  }
  if (fs.existsSync(renovatePath2)) {
    dependencyAutomationFiles.push('renovate.json');
  }

  // Check for CI/CD automation
  const githubActionsPath = path.join(repoPath, '.github', 'workflows');
  const gitlabCIPath = path.join(repoPath, '.gitlab-ci.yml');
  const circleCIPath = path.join(repoPath, '.circleci', 'config.yml');
  const jenkinsPath = path.join(repoPath, 'Jenkinsfile');

  if (fs.existsSync(githubActionsPath) && fs.statSync(githubActionsPath).isDirectory()) {
    const workflows = fs.readdirSync(githubActionsPath);
    workflows.forEach((wf) => {
      if (wf.endsWith('.yml') || wf.endsWith('.yaml')) {
        cicdAutomationFiles.push(`.github/workflows/${wf}`);
      }
    });
  }
  if (fs.existsSync(gitlabCIPath)) {
    cicdAutomationFiles.push('.gitlab-ci.yml');
  }
  if (fs.existsSync(circleCIPath)) {
    cicdAutomationFiles.push('.circleci/config.yml');
  }
  if (fs.existsSync(jenkinsPath)) {
    cicdAutomationFiles.push('Jenkinsfile');
  }

  const hasDependencyAutomation = dependencyAutomationFiles.length > 0;
  const hasCicdAutomation = cicdAutomationFiles.length > 0;

  // Risk level: high if both missing, medium if one missing, low if both present
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (!hasDependencyAutomation && !hasCicdAutomation) {
    riskLevel = 'high';
  } else if (!hasDependencyAutomation || !hasCicdAutomation) {
    riskLevel = 'medium';
  }

  return {
    hasDependencyAutomation,
    hasCicdAutomation,
    dependencyAutomationFiles,
    cicdAutomationFiles,
    riskLevel,
  };
}

/**
 * Get technical debt indicators for a single repository
 */
export async function getTechnicalDebtIndicators(
  repoPath: string,
  useCache: boolean = true,
  onProgress?: (progress: number, step?: string) => void,
  includeAIInsights?: boolean
): Promise<TechnicalDebtIndicators> {
  // If recalculating (useCache=false), clear AI insights cache for this analysis type
  if (!useCache) {
    await clearCachedAIInsights(repoPath, 'technical-debt-indicators');
  }

  // Check cache first (default: 1 hour cache)
  if (useCache) {
    const cached = await getCachedTechnicalDebtIndicators(repoPath); // Uses default 30-day TTL as fallback
    if (cached) {
      // If AI insights are requested, check cache first, then generate if needed
      if (includeAIInsights) {
        try {
          const ollamaSettings = await getOllamaSettings();
          if (ollamaSettings.enabled) {
            // Check for cached AI insights first
            const cachedInsights = await getCachedAIInsights(repoPath, 'technical-debt-indicators');
            if (cachedInsights) {
              if (onProgress) {
                onProgress(100, 'Returned from cache');
              }
              return { ...cached, aiInsights: cachedInsights };
            }
            // Generate new insights if not cached
            if (onProgress) {
              onProgress(95, 'Generating AI insights...');
            }
            const insights = await generateInsights(
              'technical-debt-indicators',
              cached,
              ollamaSettings
            );
            // Cache the insights
            await setCachedAIInsights(repoPath, 'technical-debt-indicators', insights);
            if (onProgress) {
              onProgress(100, 'Completed');
            }
            return { ...cached, aiInsights: insights };
          }
        } catch (error) {
          // Log error but don't fail the entire request if AI insights fail
          console.warn('Failed to generate AI insights for technical debt indicators:', error);
        }
      }
      if (onProgress) {
        onProgress(100, 'Returned from cache');
      }
      return cached;
    }
  }

  const git = simpleGit(repoPath);

  const updateProgress = (progress: number, step?: string) => {
    if (step) {
      console.log(`[Technical Debt] ${step} - ${Math.round(progress)}%`);
    }
    if (onProgress) {
      onProgress(progress, step);
    }
  };

  try {
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      throw new Error('Not a git repository');
    }

    updateProgress(5, 'Initializing analysis...');

    // Define all analysis tasks with their weights for progress calculation
    const totalWeight = 100;
    let completedWeight = 5; // Start with initialization

    // Create analysis tasks - all can run in parallel since they're independent
    const analysisTasks = [
      {
        name: 'Detecting commented-out code',
        fn: () => detectCommentedOutCode(repoPath, git),
        weight: 10,
        index: 0,
      },
      {
        name: 'Detecting huge commits',
        fn: () => detectHugeCommits(repoPath, git),
        weight: 10,
        index: 1,
      },
      {
        name: 'Detecting WIP commits',
        fn: () => detectWipCommits(repoPath, git),
        weight: 5,
        index: 2,
      },
      {
        name: 'Detecting quick fix commits',
        fn: () => detectQuickFixCommits(repoPath, git),
        weight: 5,
        index: 3,
      },
      {
        name: 'Detecting large binary files',
        fn: () => detectLargeBinaryFiles(repoPath, git),
        weight: 15,
        index: 4,
      },
      {
        name: 'Analyzing vendored code growth',
        fn: () => detectVendoredCodeGrowth(repoPath, git),
        weight: 10,
        index: 5,
      },
      {
        name: 'Detecting long-lived branches',
        fn: () => detectLongLivedBranches(repoPath, git),
        weight: 15,
        index: 6,
      },
      {
        name: 'Analyzing branch proliferation',
        fn: () => analyzeBranchProliferation(repoPath, git),
        weight: 5,
        index: 7,
      },
      {
        name: 'Analyzing dependency drift',
        fn: () => analyzeDependencyDrift(repoPath, git),
        weight: 15,
        index: 8,
      },
      {
        name: 'Checking automation',
        fn: () => analyzeMissingAutomation(repoPath),
        weight: 10,
        index: 9,
      },
    ];

    // Initialize results array
    const results: any[] = new Array(analysisTasks.length);

    // Start all analyses in parallel
    updateProgress(10, 'Starting parallel analyses...');
    const taskPromises = analysisTasks.map((task) => {
      return task
        .fn()
        .then((result) => {
          results[task.index] = result;
          completedWeight += task.weight;
          const progress = 5 + (completedWeight / totalWeight) * 90;
          updateProgress(progress, `${task.name} completed`);
          return { index: task.index, result };
        })
        .catch((error) => {
          console.error(`[Technical Debt] Error in ${task.name}:`, error);
          // Return empty result on error to not block other analyses
          results[task.index] =
            task.index === 2 || task.index === 3
              ? []
              : task.index === 7
                ? {
                    totalBranches: 0,
                    activeBranches: 0,
                    mergedBranches: 0,
                    unmergedBranches: 0,
                    riskLevel: 'low' as const,
                  }
                : task.index === 8
                  ? { lockfiles: [], dependencyBumps: [], staleDependencies: [] }
                  : task.index === 9
                    ? {
                        hasDependencyAutomation: false,
                        hasCicdAutomation: false,
                        dependencyAutomationFiles: [],
                        cicdAutomationFiles: [],
                        riskLevel: 'high' as const,
                      }
                    : [];
          completedWeight += task.weight;
          const progress = 5 + (completedWeight / totalWeight) * 90;
          updateProgress(progress, `${task.name} failed`);
          return { index: task.index, result: results[task.index] };
        });
    });

    // Wait for all analyses to complete
    await Promise.all(taskPromises);

    updateProgress(95, 'Finalizing results...');

    const [
      commentedOutCode,
      hugeCommits,
      wipCommits,
      quickFixCommits,
      largeBinaryFiles,
      vendoredCodeGrowth,
      longLivedBranches,
      branchProliferation,
      dependencyDrift,
      missingAutomation,
    ] = results;

    updateProgress(100, 'Analysis complete');

    const result: TechnicalDebtIndicators = {
      commentedOutCode,
      hugeCommits,
      wipCommits,
      quickFixCommits,
      largeBinaryFiles,
      vendoredCodeGrowth,
      longLivedBranches,
      branchProliferation,
      dependencyDrift,
      missingAutomation,
    };

    // Generate AI insights if requested
    if (includeAIInsights) {
      try {
        updateProgress(95, 'Generating AI insights...');
        const ollamaSettings = await getOllamaSettings();
        if (ollamaSettings.enabled) {
          // Check for cached AI insights first
          const cachedInsights = await getCachedAIInsights(repoPath, 'technical-debt-indicators');
          if (cachedInsights) {
            result.aiInsights = cachedInsights;
          } else {
            // Generate new insights
            const insights = await generateInsights(
              'technical-debt-indicators',
              result,
              ollamaSettings
            );
            // Cache the insights
            await setCachedAIInsights(repoPath, 'technical-debt-indicators', insights);
            result.aiInsights = insights;
          }
        }
      } catch (error) {
        // Log error but don't fail the entire request if AI insights fail
        console.warn('Failed to generate AI insights for technical debt indicators:', error);
      }
    }

    // Cache the result (without AI insights for caching)
    if (useCache) {
      const resultToCache = { ...result };
      delete resultToCache.aiInsights;
      await setCachedTechnicalDebtIndicators(repoPath, resultToCache);
    }

    updateProgress(100, 'Completed');
    return result;
  } catch (error: any) {
    console.error(
      `[Technical Debt] Error calculating technical debt indicators for ${repoPath}:`,
      error
    );
    throw error;
  }
}

/**
 * Get cross-repository technical debt indicators
 */
export async function getCrossRepoTechnicalDebtIndicators(
  projectId: string,
  useCache: boolean = true
): Promise<CrossRepoTechnicalDebtIndicators> {
  console.log(`Calculating cross-repo technical debt indicators for project ${projectId}`);
  const repositories = await getRepositories(projectId);

  if (repositories.length === 0) {
    return {
      repositories: [],
      aggregated: {
        totalCommentedOutCode: 0,
        totalHugeCommits: 0,
        totalWipCommits: 0,
        totalQuickFixCommits: 0,
        totalLargeBinaryFiles: 0,
        totalVendoredCodeGrowth: 0,
        totalLongLivedBranches: 0,
        averageBranchProliferation: 0,
        reposWithStaleDependencies: 0,
        reposWithoutDependencyAutomation: 0,
        reposWithoutCicdAutomation: 0,
      },
      totalRepos: 0,
      repoNames: [],
    };
  }

  const repoAnalyses = await Promise.all(
    repositories.map(async (repo) => {
      try {
        const indicators = await getTechnicalDebtIndicators(repo.path, useCache);
        return {
          repoName: repo.name || path.basename(repo.path),
          repoPath: repo.path,
          indicators,
        };
      } catch (error) {
        console.error(`Error analyzing ${repo.path}:`, error);
        return null;
      }
    })
  );

  const validAnalyses = repoAnalyses.filter((r) => r !== null) as {
    repoName: string;
    repoPath: string;
    indicators: TechnicalDebtIndicators;
  }[];

  // Aggregate metrics
  const aggregated = {
    totalCommentedOutCode: validAnalyses.reduce(
      (sum, r) => sum + r.indicators.commentedOutCode.length,
      0
    ),
    totalHugeCommits: validAnalyses.reduce((sum, r) => sum + r.indicators.hugeCommits.length, 0),
    totalWipCommits: validAnalyses.reduce((sum, r) => sum + r.indicators.wipCommits.length, 0),
    totalQuickFixCommits: validAnalyses.reduce(
      (sum, r) => sum + r.indicators.quickFixCommits.length,
      0
    ),
    totalLargeBinaryFiles: validAnalyses.reduce(
      (sum, r) => sum + r.indicators.largeBinaryFiles.length,
      0
    ),
    totalVendoredCodeGrowth: validAnalyses.reduce(
      (sum, r) => sum + r.indicators.vendoredCodeGrowth.length,
      0
    ),
    totalLongLivedBranches: validAnalyses.reduce(
      (sum, r) => sum + r.indicators.longLivedBranches.length,
      0
    ),
    averageBranchProliferation:
      validAnalyses.length > 0
        ? validAnalyses.reduce(
            (sum, r) => sum + r.indicators.branchProliferation.totalBranches,
            0
          ) / validAnalyses.length
        : 0,
    reposWithStaleDependencies: validAnalyses.filter(
      (r) => r.indicators.dependencyDrift.staleDependencies.length > 0
    ).length,
    reposWithoutDependencyAutomation: validAnalyses.filter(
      (r) => !r.indicators.missingAutomation.hasDependencyAutomation
    ).length,
    reposWithoutCicdAutomation: validAnalyses.filter(
      (r) => !r.indicators.missingAutomation.hasCicdAutomation
    ).length,
  };

  return {
    repositories: validAnalyses,
    aggregated,
    totalRepos: validAnalyses.length,
    repoNames: validAnalyses.map((r) => r.repoName),
  };
}
