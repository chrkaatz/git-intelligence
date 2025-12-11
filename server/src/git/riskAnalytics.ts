import simpleGit from 'simple-git';
import { getRepositories, getCachedRiskAnalytics, setCachedRiskAnalytics } from '../db.js';
import { normalizeEmail, shouldExcludeFileFromAnalysis } from './utils.js';
import { getCodebaseHealth } from './codebaseHealth.js';
import { getBusFactorAndOwnership } from './busFactor.js';
import type {
  RiskAnalytics,
  HighRiskHotspot,
  TemporalCouplingHotspot,
  RiskyFileTrend,
  CrossRepoRiskAnalytics,
} from './types.js';

export async function getRiskAnalytics(
  repoPath: string,
  useCache: boolean = true
): Promise<RiskAnalytics> {
  // Check cache first
  if (useCache) {
    const cached = await getCachedRiskAnalytics(repoPath); // Uses default 30-day TTL as fallback
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

    // Get codebase health and bus factor data
    const [codebaseHealth, busFactor] = await Promise.all([
      getCodebaseHealth(repoPath, useCache),
      getBusFactorAndOwnership(repoPath, useCache),
    ]);

    // Get commit history with author info for ownership diversity
    const numstatRaw = await git.raw([
      'log',
      '--all',
      '--numstat',
      '--pretty=format:%H|%ae|%ad',
      '--date=iso',
    ]);

    // Build file metrics maps for quick lookup
    const fileChurnMap = new Map<string, number>(); // file -> commits
    const fileComplexityMap = new Map<string, number>(); // file -> avg diff size
    const fileOwnershipMap = new Map<string, number>(); // file -> ownership diversity (author count)
    const fileCouplingMap = new Map<string, number>(); // file -> coupling count (how many files it changes with)

    // Populate from codebase health
    codebaseHealth.hotspots.files.forEach((file) => {
      fileChurnMap.set(file.file, file.commits);
    });

    codebaseHealth.complexity.averageDiffSizes.forEach((file) => {
      fileComplexityMap.set(file.file, file.averageDiffSize);
    });

    // Populate ownership diversity from bus factor (single maintainer files)
    busFactor.singleMaintainerRisk.files.forEach((file) => {
      // Single maintainer = low diversity (1 author)
      fileOwnershipMap.set(file.file, 1);
    });

    // Get full author counts for all files
    const lines = numstatRaw.split('\n');
    let currentCommit: {
      hash: string;
      authorEmail: string;
      date: Date;
    } | null = null;
    const fileAuthors = new Map<string, Set<string>>(); // file -> set of author emails

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const commitMatch = line.match(/^([a-f0-9]{40})\|(.+)\|(.+)$/);
      if (commitMatch) {
        const [, hash, authorEmail, dateStr] = commitMatch;
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            const dateFixed = new Date(dateStr.replace(' ', 'T'));
            if (isNaN(dateFixed.getTime())) continue;
            currentCommit = { hash, authorEmail, date: dateFixed };
          } else {
            currentCommit = { hash, authorEmail, date };
          }
        } catch {
          continue;
        }
        continue;
      }

      if (line.includes('\t') && currentCommit) {
        const parts = line.split('\t');
        if (parts.length >= 3) {
          const filePath = parts.slice(2).join('\t');
          if (filePath) {
            // Skip excluded files (package-lock.json, translations, etc.)
            if (shouldExcludeFileFromAnalysis(filePath)) {
              continue;
            }

            const normalizedEmail = normalizeEmail(currentCommit.authorEmail);

            if (!fileAuthors.has(filePath)) {
              fileAuthors.set(filePath, new Set());
            }
            fileAuthors.get(filePath)!.add(normalizedEmail);
          }
        }
      }
    }

    // Calculate ownership diversity for all files
    fileAuthors.forEach((authors, file) => {
      if (!fileOwnershipMap.has(file)) {
        fileOwnershipMap.set(file, authors.size);
      }
    });

    // Build coupling map from change coupling pairs
    codebaseHealth.changeCoupling.pairs.forEach((pair) => {
      const count1 = fileCouplingMap.get(pair.file1) || 0;
      const count2 = fileCouplingMap.get(pair.file2) || 0;
      fileCouplingMap.set(pair.file1, count1 + 1);
      fileCouplingMap.set(pair.file2, count2 + 1);
    });

    // 1. High-Risk Hotspots
    // Combine: high churn + high complexity + low ownership diversity
    const highRiskHotspots: HighRiskHotspot[] = [];
    const allFiles = new Set<string>();
    fileChurnMap.forEach((_, file) => allFiles.add(file));
    fileComplexityMap.forEach((_, file) => allFiles.add(file));
    fileOwnershipMap.forEach((_, file) => allFiles.add(file));

    allFiles.forEach((file) => {
      // Skip excluded files (package-lock.json, translations, etc.)
      if (shouldExcludeFileFromAnalysis(file)) {
        return;
      }

      const churn = fileChurnMap.get(file) || 0;
      const complexity = fileComplexityMap.get(file) || 0;
      const ownershipDiversity = fileOwnershipMap.get(file) || 0;

      // Calculate risk score (0-100)
      // High churn (commits) = higher risk
      // High complexity (avg diff size) = higher risk
      // Low ownership diversity (fewer authors) = higher risk
      const churnScore = Math.min(100, (churn / 50) * 100); // Normalize: 50+ commits = 100
      const complexityScore = Math.min(100, (complexity / 500) * 100); // Normalize: 500+ lines = 100
      const ownershipScore =
        ownershipDiversity <= 1 ? 100 : Math.max(0, 100 - (ownershipDiversity - 1) * 20); // 1 author = 100, 2 = 80, 3 = 60, etc.

      // Weighted risk score
      const riskScore = churnScore * 0.4 + complexityScore * 0.3 + ownershipScore * 0.3;

      // Only include files with significant risk (score >= 40)
      if (riskScore >= 40 && (churn >= 10 || complexity >= 100 || ownershipDiversity <= 2)) {
        let riskLevel: 'low' | 'medium' | 'high';
        if (riskScore >= 70) {
          riskLevel = 'high';
        } else if (riskScore >= 50) {
          riskLevel = 'medium';
        } else {
          riskLevel = 'low';
        }

        highRiskHotspots.push({
          file,
          riskScore: Math.round(riskScore * 10) / 10,
          churn,
          complexity,
          ownershipDiversity,
          riskLevel,
        });
      }
    });

    highRiskHotspots.sort((a, b) => b.riskScore - a.riskScore);

    // 2. Temporal Coupling Hotspots
    // Files that change together frequently (high coupling count)
    const temporalCouplingHotspots: TemporalCouplingHotspot[] = Array.from(
      fileCouplingMap.entries()
    )
      .map(([file, couplingCount]) => {
        // Find all pairs involving this file
        const relatedFiles = codebaseHealth.changeCoupling.pairs
          .filter((pair) => pair.file1 === file || pair.file2 === file)
          .map((pair) => (pair.file1 === file ? pair.file2 : pair.file1))
          .slice(0, 10); // Top 10 related files

        const totalCoChanges = codebaseHealth.changeCoupling.pairs
          .filter((pair) => pair.file1 === file || pair.file2 === file)
          .reduce((sum, pair) => sum + pair.coChanges, 0);

        let riskLevel: 'low' | 'medium' | 'high';
        if (couplingCount >= 10) {
          riskLevel = 'high';
        } else if (couplingCount >= 5) {
          riskLevel = 'medium';
        } else {
          riskLevel = 'low';
        }

        return {
          file,
          couplingCount,
          relatedFiles,
          totalCoChanges,
          riskLevel,
        };
      })
      .filter((hotspot) => {
        // Exclude files that should be filtered out
        if (shouldExcludeFileFromAnalysis(hotspot.file)) {
          return false;
        }
        // Only files with significant coupling
        return hotspot.couplingCount >= 3;
      })
      .sort((a, b) => b.couplingCount - a.couplingCount);

    // 3. Trend of Risky Files
    // Analyze risk score over time for files
    // For now, we'll use a simplified approach based on commit frequency over time
    const riskyFileTrends: RiskyFileTrend[] = [];

    // Get commit history for trend analysis (oldest first)
    const trendNumstatRaw = await git.raw([
      'log',
      '--all',
      '--numstat',
      '--pretty=format:%H|%ad',
      '--date=iso',
      '--reverse',
    ]);

    // Track file commits by month
    const fileCommitsByMonth = new Map<string, Map<string, number>>(); // file -> month -> commit count
    const trendLines = trendNumstatRaw.split('\n');
    let currentCommitHash = '';
    let currentDate: Date | null = null;

    for (let i = 0; i < trendLines.length; i++) {
      const line = trendLines[i].trim();
      if (!line) continue;

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
        continue;
      }

      if (line.includes('\t') && currentCommitHash && currentDate) {
        const parts = line.split('\t');
        if (parts.length >= 3) {
          const filePath = parts.slice(2).join('\t');
          if (filePath) {
            // Skip excluded files (package-lock.json, translations, etc.)
            if (shouldExcludeFileFromAnalysis(filePath)) {
              continue;
            }

            const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            if (!fileCommitsByMonth.has(filePath)) {
              fileCommitsByMonth.set(filePath, new Map());
            }
            const monthMap = fileCommitsByMonth.get(filePath)!;
            monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
          }
        }
      }
    }

    // Calculate risk at different time points (last 6 months)
    const timeWindows: Date[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      date.setDate(1); // First of month
      timeWindows.push(date);
    }

    // For each high-risk file, calculate trend
    highRiskHotspots.slice(0, 20).forEach((hotspot) => {
      const file = hotspot.file;
      const commitsByMonth = fileCommitsByMonth.get(file) || new Map();

      // Calculate risk at each time window based on commit frequency
      const trendPoints: { date: string; riskScore: number }[] = [];
      const baseRisk = hotspot.riskScore;

      timeWindows.forEach((windowDate) => {
        const monthKey = `${windowDate.getFullYear()}-${String(windowDate.getMonth() + 1).padStart(2, '0')}`;
        const commitsInMonth = commitsByMonth.get(monthKey) || 0;

        // Risk increases with commit frequency (more commits = higher risk)
        // Normalize: 10+ commits in a month = max risk contribution
        const commitRiskFactor = Math.min(1, commitsInMonth / 10);
        const trendRisk = baseRisk * 0.5 + baseRisk * 0.5 * commitRiskFactor;

        trendPoints.push({
          date: windowDate.toISOString().split('T')[0],
          riskScore: Math.round(trendRisk * 10) / 10,
        });
      });

      // Calculate trend direction
      const firstRisk = trendPoints[0]?.riskScore || 0;
      const lastRisk = trendPoints[trendPoints.length - 1]?.riskScore || 0;
      const trendDirection =
        lastRisk > firstRisk ? 'increasing' : lastRisk < firstRisk ? 'decreasing' : 'stable';
      const trendPercentage = firstRisk > 0 ? ((lastRisk - firstRisk) / firstRisk) * 100 : 0;

      riskyFileTrends.push({
        file,
        currentRiskScore: hotspot.riskScore,
        trendPoints,
        trendDirection,
        trendPercentage: Math.round(trendPercentage * 10) / 10,
        riskLevel: hotspot.riskLevel,
      });
    });

    riskyFileTrends.sort((a, b) => b.currentRiskScore - a.currentRiskScore);

    const result: RiskAnalytics = {
      highRiskHotspots: highRiskHotspots.slice(0, 50), // Top 50
      temporalCouplingHotspots: temporalCouplingHotspots.slice(0, 30), // Top 30
      riskyFileTrends: riskyFileTrends.slice(0, 20), // Top 20
    };

    // Cache the result
    if (useCache) {
      await setCachedRiskAnalytics(repoPath, result);
    }

    return result;
  } catch (error) {
    console.error('Risk analytics error:', error);
    throw error;
  }
}

export async function getCrossRepoRiskAnalytics(
  projectId: string,
  useCache: boolean = true
): Promise<CrossRepoRiskAnalytics> {
  console.log(`Calculating cross-repo risk analytics for project ${projectId}`);

  const repositories = await getRepositories(projectId);

  if (repositories.length === 0) {
    return {
      highRiskHotspots: {
        repositories: [],
        aggregatedFiles: [],
      },
      temporalCouplingHotspots: {
        repositories: [],
        aggregatedFiles: [],
      },
      riskyFileTrends: {
        repositories: [],
        aggregatedFiles: [],
      },
      totalRepos: 0,
      repoNames: [],
    };
  }

  const repoHighRiskHotspots: {
    repoName: string;
    repoPath: string;
    hotspots: HighRiskHotspot[];
  }[] = [];
  const aggregatedHighRiskFiles = new Map<string, HighRiskHotspot>();

  const repoTemporalCoupling: {
    repoName: string;
    repoPath: string;
    hotspots: TemporalCouplingHotspot[];
  }[] = [];
  const aggregatedCouplingFiles = new Map<string, TemporalCouplingHotspot>();

  const repoRiskyTrends: {
    repoName: string;
    repoPath: string;
    trends: RiskyFileTrend[];
  }[] = [];
  const aggregatedTrends = new Map<string, RiskyFileTrend>();

  // Process each repository
  for (const repo of repositories) {
    try {
      const analytics = await getRiskAnalytics(repo.path, useCache);

      // High-risk hotspots
      repoHighRiskHotspots.push({
        repoName: repo.name,
        repoPath: repo.path,
        hotspots: analytics.highRiskHotspots,
      });

      analytics.highRiskHotspots.forEach((hotspot) => {
        const key = `${repo.name}:${hotspot.file}`;
        if (
          !aggregatedHighRiskFiles.has(key) ||
          hotspot.riskScore > aggregatedHighRiskFiles.get(key)!.riskScore
        ) {
          aggregatedHighRiskFiles.set(key, {
            ...hotspot,
            file: key,
          });
        }
      });

      // Temporal coupling
      repoTemporalCoupling.push({
        repoName: repo.name,
        repoPath: repo.path,
        hotspots: analytics.temporalCouplingHotspots,
      });

      analytics.temporalCouplingHotspots.forEach((hotspot) => {
        const key = `${repo.name}:${hotspot.file}`;
        if (
          !aggregatedCouplingFiles.has(key) ||
          hotspot.couplingCount > aggregatedCouplingFiles.get(key)!.couplingCount
        ) {
          aggregatedCouplingFiles.set(key, {
            ...hotspot,
            file: key,
            relatedFiles: hotspot.relatedFiles.map((f) => `${repo.name}:${f}`),
          });
        }
      });

      // Risky file trends
      repoRiskyTrends.push({
        repoName: repo.name,
        repoPath: repo.path,
        trends: analytics.riskyFileTrends,
      });

      analytics.riskyFileTrends.forEach((trend) => {
        const key = `${repo.name}:${trend.file}`;
        if (
          !aggregatedTrends.has(key) ||
          trend.currentRiskScore > aggregatedTrends.get(key)!.currentRiskScore
        ) {
          aggregatedTrends.set(key, {
            ...trend,
            file: key,
          });
        }
      });
    } catch (error) {
      console.error(`Failed to analyze repository ${repo.path}:`, error);
      // Continue with other repositories
    }
  }

  // Sort and limit aggregated results
  const aggregatedHighRisk = Array.from(aggregatedHighRiskFiles.values())
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 50);

  const aggregatedCoupling = Array.from(aggregatedCouplingFiles.values())
    .sort((a, b) => b.couplingCount - a.couplingCount)
    .slice(0, 30);

  const aggregatedTrendsList = Array.from(aggregatedTrends.values())
    .sort((a, b) => b.currentRiskScore - a.currentRiskScore)
    .slice(0, 20);

  return {
    highRiskHotspots: {
      repositories: repoHighRiskHotspots,
      aggregatedFiles: aggregatedHighRisk,
    },
    temporalCouplingHotspots: {
      repositories: repoTemporalCoupling,
      aggregatedFiles: aggregatedCoupling,
    },
    riskyFileTrends: {
      repositories: repoRiskyTrends,
      aggregatedFiles: aggregatedTrendsList,
    },
    totalRepos: repositories.length,
    repoNames: repositories.map((r) => r.name),
  };
}
