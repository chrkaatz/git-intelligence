import simpleGit from 'simple-git';
import {
  getCachedCodebaseHealth,
  setCachedCodebaseHealth,
  getCachedAIInsights,
  setCachedAIInsights,
  getRepositories,
  getOllamaSettings,
} from '../db.js';
import { generateInsights } from '../services/aiAnalysis.js';
import { shouldExcludeFileFromAnalysis } from './utils.js';
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
  RepositoryHygiene,
  BranchInfo,
} from './types.js';
import fs from 'fs';
import path from 'path';

/**
 * Analyze repository hygiene indicators:
 * - Branch count and lifetime
 * - Dependency management automation (Dependabot, Renovate)
 * - CI/CD automation (GitHub Actions, GitLab CI, CircleCI, Jenkins)
 */
async function analyzeRepositoryHygiene(
  repoPath: string,
  git: ReturnType<typeof simpleGit>
): Promise<RepositoryHygiene> {
  const now = new Date();

  // 1. Branch Analysis
  let branchCount = 0;
  let unmergedBranchCount = 0;
  let oldestUnmergedBranchDays = 0;
  const unmergedBranches: BranchInfo[] = [];

  try {
    // Get all branches using for-each-ref (more reliable)
    const branchesRaw = await git.raw([
      'for-each-ref',
      '--format=%(refname:short)|%(committerdate:iso)',
      'refs/heads/',
      'refs/remotes/',
    ]);
    const branches = branchesRaw
      .split('\n')
      .filter((line) => line.trim() && !line.includes('HEAD'))
      .map((line) => {
        const [name, dateStr] = line.split('|');
        return {
          name: name?.trim() || '',
          date: dateStr ? new Date(dateStr.trim()) : null,
        };
      })
      .filter((b) => b.name && b.date && !isNaN(b.date.getTime()));

    branchCount = branches.length;

    // Get merged branches (branches that have been merged into main/master)
    let mergedBranches: Set<string> = new Set();
    try {
      // Try to find main branch
      const mainBranches = ['main', 'master', 'develop'];
      let mainBranch = null;
      for (const branch of mainBranches) {
        try {
          await git.raw(['show-ref', '--verify', '--quiet', `refs/heads/${branch}`]);
          mainBranch = branch;
          break;
        } catch {
          // Branch doesn't exist, try next
        }
      }

      if (mainBranch) {
        const mergedRaw = await git.raw(['branch', '-a', '--merged', mainBranch]);
        mergedBranches = new Set(
          mergedRaw
            .split('\n')
            .filter((line) => line.trim() && !line.includes('HEAD'))
            .map((line) => {
              // Clean up branch name (remove * prefix, remotes/origin/ prefix)
              return line
                .trim()
                .replace(/^\*\s*/, '')
                .replace(/^remotes\/origin\//, '')
                .replace(/^remotes\//, '');
            })
        );
      }
    } catch (error) {
      console.warn('Could not determine merged branches:', error);
    }

    // Analyze unmerged branches
    for (const branch of branches) {
      const branchName = branch.name.replace(/^origin\//, '').replace(/^remotes\//, '');
      if (branchName === 'main' || branchName === 'master' || branchName === 'develop') {
        continue; // Skip main branches
      }

      const isMerged = mergedBranches.has(branchName) || mergedBranches.has(`origin/${branchName}`);
      if (!isMerged && branch.date) {
        unmergedBranchCount++;
        const daysSince = Math.floor(
          (now.getTime() - branch.date.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSince > oldestUnmergedBranchDays) {
          oldestUnmergedBranchDays = daysSince;
        }
        unmergedBranches.push({
          name: branchName,
          lastCommitDate: branch.date.toISOString(),
          daysSinceLastCommit: daysSince,
          isMerged: false,
        });
      }
    }

    // Sort by age (oldest first)
    unmergedBranches.sort((a, b) => b.daysSinceLastCommit - a.daysSinceLastCommit);
  } catch (error) {
    console.warn('Error analyzing branches:', error);
  }

  // 2. Dependency Management Automation
  const dependencyConfigFiles: string[] = [];
  const dependencyPaths = [
    '.github/dependabot.yml',
    '.github/dependabot.yaml',
    '.dependabot.yml',
    '.dependabot.yaml',
    '.renovate.json',
    '.renovate.json5',
    'renovate.json',
    'renovate.json5',
  ];

  let hasDependabot = false;
  let hasRenovate = false;

  for (const configPath of dependencyPaths) {
    const fullPath = path.join(repoPath, configPath);
    if (fs.existsSync(fullPath)) {
      dependencyConfigFiles.push(configPath);
      if (configPath.includes('dependabot')) {
        hasDependabot = true;
      } else if (configPath.includes('renovate')) {
        hasRenovate = true;
      }
    }
  }

  // 3. CI/CD Automation
  const cicdConfigFiles: string[] = [];
  let hasGitHubActions = false;
  let hasGitLabCI = false;
  let hasCircleCI = false;
  let hasJenkins = false;

  // Check GitHub Actions
  const githubActionsPath = path.join(repoPath, '.github', 'workflows');
  if (fs.existsSync(githubActionsPath) && fs.statSync(githubActionsPath).isDirectory()) {
    const workflows = fs.readdirSync(githubActionsPath).filter((file) => {
      const filePath = path.join(githubActionsPath, file);
      return fs.statSync(filePath).isFile() && (file.endsWith('.yml') || file.endsWith('.yaml'));
    });
    if (workflows.length > 0) {
      hasGitHubActions = true;
      workflows.forEach((workflow) => {
        cicdConfigFiles.push(`.github/workflows/${workflow}`);
      });
    }
  }

  // Check GitLab CI
  const gitlabCIPath = path.join(repoPath, '.gitlab-ci.yml');
  if (fs.existsSync(gitlabCIPath)) {
    hasGitLabCI = true;
    cicdConfigFiles.push('.gitlab-ci.yml');
  }

  // Check CircleCI
  const circleCIPath = path.join(repoPath, '.circleci');
  if (fs.existsSync(circleCIPath) && fs.statSync(circleCIPath).isDirectory()) {
    const configFile = path.join(circleCIPath, 'config.yml');
    if (fs.existsSync(configFile)) {
      hasCircleCI = true;
      cicdConfigFiles.push('.circleci/config.yml');
    }
  }

  // Check Jenkins
  const jenkinsPaths = ['Jenkinsfile', 'Jenkinsfile.groovy', '.jenkins/Jenkinsfile'];
  for (const jenkinsPath of jenkinsPaths) {
    const fullPath = path.join(repoPath, jenkinsPath);
    if (fs.existsSync(fullPath)) {
      hasJenkins = true;
      cicdConfigFiles.push(jenkinsPath);
      break;
    }
  }

  return {
    branchCount,
    unmergedBranchCount,
    oldestUnmergedBranchDays,
    unmergedBranches: unmergedBranches.slice(0, 20), // Limit to top 20 oldest
    dependencyAutomation: {
      hasDependabot,
      hasRenovate,
      configFiles: dependencyConfigFiles,
    },
    cicdAutomation: {
      hasGitHubActions,
      hasGitLabCI,
      hasCircleCI,
      hasJenkins,
      configFiles: cicdConfigFiles,
    },
  };
}

export async function getCodebaseHealth(
  repoPath: string,
  useCache: boolean = true,
  includeAIInsights?: boolean
): Promise<CodebaseHealth> {
  // Check cache first (default: 1 hour cache)
  if (useCache) {
    const cached = await getCachedCodebaseHealth(repoPath); // Uses default 30-day TTL as fallback
    if (cached) {
      // If AI insights are requested, check cache first, then generate if needed
      if (includeAIInsights) {
        try {
          const ollamaSettings = await getOllamaSettings();
          if (ollamaSettings.enabled) {
            // Check for cached AI insights first
            const cachedInsights = await getCachedAIInsights(repoPath, 'codebase-health');
            if (cachedInsights) {
              return { ...cached, aiInsights: cachedInsights };
            }
            // Generate new insights if not cached
            const insights = await generateInsights('codebase-health', cached, ollamaSettings);
            // Cache the insights
            await setCachedAIInsights(repoPath, 'codebase-health', insights);
            return { ...cached, aiInsights: insights };
          }
        } catch (error) {
          // Log error but don't fail the entire request if AI insights fail
          console.warn('Failed to generate AI insights for codebase health:', error);
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

    // Get all commits with numstat to track file changes
    const numstatRaw = await git.raw([
      'log',
      '--all',
      '--numstat',
      '--pretty=format:%H|%ad',
      '--date=iso',
    ]);

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
            // Skip excluded files (package-lock.json, translations, etc.)
            if (shouldExcludeFileFromAnalysis(filePath)) {
              continue;
            }

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
              fileRewrittenLines.set(filePath, (fileRewrittenLines.get(filePath) || 0) + rewritten);
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
      fileArray.forEach((file) => {
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
      .filter((pair) => {
        // Exclude pairs where either file should be excluded
        if (
          shouldExcludeFileFromAnalysis(pair.file1) ||
          shouldExcludeFileFromAnalysis(pair.file2)
        ) {
          return false;
        }
        // Only show pairs that changed together at least 3 times
        return pair.coChanges >= 3;
      })
      .sort((a, b) => b.coChanges - a.coChanges);

    // 3. Stability
    const now = new Date();
    const stabilityFiles: StabilityFile[] = Array.from(fileFirstSeen.keys())
      .map((file) => {
        const firstSeen = fileFirstSeen.get(file)!;
        const lastSeen = fileLastSeen.get(file)!;
        const ageDays = Math.max(
          1,
          Math.floor((now.getTime() - firstSeen.getTime()) / (1000 * 60 * 60 * 24))
        );
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
      .filter((f) => {
        // Exclude files that should be filtered out
        if (shouldExcludeFileFromAnalysis(f.file)) {
          return false;
        }
        return f.changeFrequency > 0;
      })
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
      .filter((f) => {
        // Exclude files that should be filtered out
        if (shouldExcludeFileFromAnalysis(f.file)) {
          return false;
        }
        return f.averageDiffSize > 0;
      })
      .sort((a, b) => b.averageDiffSize - a.averageDiffSize);

    const largestDiffs: LargestDiff[] = Array.from(fileLargestDiff.entries())
      .map(([file, data]) => ({
        file,
        linesChanged: data.lines,
        commitHash: data.commitHash,
      }))
      .filter((f) => !shouldExcludeFileFromAnalysis(f.file)) // Exclude filtered files
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
      .filter((f) => {
        // Exclude files that should be filtered out
        if (shouldExcludeFileFromAnalysis(f.file)) {
          return false;
        }
        // Only files with significant changes
        return f.rewrittenLines > 0 && f.totalLines > 100;
      })
      .sort((a, b) => b.rewritePercentage - a.rewritePercentage);

    // 5. Repository Hygiene
    const hygiene = await analyzeRepositoryHygiene(repoPath, git);

    const health: CodebaseHealth = {
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
      hygiene,
    };

    // Generate AI insights if requested
    if (includeAIInsights) {
      try {
        const ollamaSettings = await getOllamaSettings();
        if (ollamaSettings.enabled) {
          // Check for cached AI insights first
          const cachedInsights = await getCachedAIInsights(repoPath, 'codebase-health');
          if (cachedInsights) {
            health.aiInsights = cachedInsights;
          } else {
            // Generate new insights if not cached
            const insights = await generateInsights('codebase-health', health, ollamaSettings);
            health.aiInsights = insights;
            // Cache the insights
            await setCachedAIInsights(repoPath, 'codebase-health', insights);
          }
        }
      } catch (error) {
        // Log error but don't fail the entire request if AI insights fail
        console.warn('Failed to generate AI insights for codebase health:', error);
      }
    }

    // Cache the results (without AI insights to avoid caching them)
    if (useCache) {
      const healthToCache = { ...health };
      delete healthToCache.aiInsights;
      await setCachedCodebaseHealth(repoPath, healthToCache);
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
      health.hotspots.files.forEach((file) => {
        const key = `${repo.name}:${file.file}`;
        aggregatedFileCommits.set(key, (aggregatedFileCommits.get(key) || 0) + file.commits);
      });

      // Aggregate directory commits
      health.hotspots.directories.forEach((dir) => {
        const key = `${repo.name}:${dir.directory}`;
        aggregatedDirectoryCommits.set(
          key,
          (aggregatedDirectoryCommits.get(key) || 0) + dir.commits
        );
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
    repoNames: repositories.map((r) => r.name),
  };
}
