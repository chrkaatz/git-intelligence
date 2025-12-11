import { getDb } from './database.js';
import { getLatestCommitHash } from '../git/utils.js';

export async function getCachedStats(
  repoPath: string,
  maxAgeMs: number = 2592000000
): Promise<any | null> {
  // maxAgeMs defaults to 30 days (2592000000ms) - used as fallback when commit hash unavailable
  const database = await getDb();
  const cached = database.data.analysisCache[repoPath];

  if (!cached) {
    return null;
  }

  // Check if repository has new commits since cache was created
  let currentCommitHash: string | null = null;
  try {
    currentCommitHash = await getLatestCommitHash(repoPath);
  } catch (error) {
    // If we can't get commit hash, fall through to time-based expiration
  }

  // If we can't get commit hash and we previously had one, repository might be deleted/invalid
  if (!currentCommitHash && cached.latestCommitHash) {
    // Repository no longer exists or is invalid, invalidate cache
    delete database.data.analysisCache[repoPath];
    await database.write();
    return null;
  }

  if (currentCommitHash && cached.latestCommitHash) {
    if (currentCommitHash !== cached.latestCommitHash) {
      // Repository has new commits, invalidate cache
      delete database.data.analysisCache[repoPath];
      await database.write();
      return null;
    }
    // Commit hash matches - cache is still valid (no time check needed)
    return cached.stats;
  } else if (
    currentCommitHash &&
    (cached.latestCommitHash === undefined || cached.latestCommitHash === null)
  ) {
    // Cache was created before we started tracking commit hashes, or commit hash wasn't available when cached
    // Only invalidate if we can successfully get a commit hash now (meaning we should be able to track it going forward)
    // This prevents infinite invalidation loops if getLatestCommitHash fails intermittently
    delete database.data.analysisCache[repoPath];
    await database.write();
    return null;
  }

  // Fallback: if we can't get commit hash, use time-based expiration as safety net
  const cachedAt = new Date(cached.cachedAt).getTime();
  const now = Date.now();
  const age = now - cachedAt;

  if (age > maxAgeMs) {
    // Cache expired (fallback when commit hash unavailable)
    delete database.data.analysisCache[repoPath];
    await database.write();
    return null;
  }

  return cached.stats;
}

export async function setCachedStats(repoPath: string, stats: any): Promise<void> {
  const database = await getDb();
  // Get the latest commit hash when caching
  const latestCommitHash = await getLatestCommitHash(repoPath);
  database.data.analysisCache[repoPath] = {
    stats,
    cachedAt: new Date().toISOString(),
    repoPath,
    // Only store commit hash if we successfully retrieved it
    // If null, don't store it (leave it undefined) so we use time-based expiration as fallback
    ...(latestCommitHash ? { latestCommitHash } : {}),
  };
  await database.write();
}

export async function getCachedDeveloperAnalytics(
  repoPath: string,
  maxAgeMs: number = 2592000000
): Promise<any | null> {
  // maxAgeMs defaults to 30 days (2592000000ms) - used as fallback when commit hash unavailable
  const database = await getDb();
  const cached = database.data.developerAnalyticsCache?.[repoPath];

  if (!cached) {
    return null;
  }

  // Check if repository has new commits since cache was created
  const currentCommitHash = await getLatestCommitHash(repoPath);

  // If we can't get commit hash and we previously had one, repository might be deleted/invalid
  if (!currentCommitHash && cached.latestCommitHash) {
    // Repository no longer exists or is invalid, invalidate cache
    if (database.data.developerAnalyticsCache) {
      delete database.data.developerAnalyticsCache[repoPath];
      await database.write();
    }
    return null;
  }

  if (currentCommitHash && cached.latestCommitHash) {
    if (currentCommitHash !== cached.latestCommitHash) {
      // Repository has new commits, invalidate cache
      if (database.data.developerAnalyticsCache) {
        delete database.data.developerAnalyticsCache[repoPath];
        await database.write();
      }
      return null;
    }
    // Commit hash matches - cache is still valid (no time check needed)
    return cached.analytics;
  } else if (currentCommitHash && !cached.latestCommitHash) {
    // Cache was created before we started tracking commit hashes
    // Invalidate it to ensure we get fresh data with commit hash tracking
    if (database.data.developerAnalyticsCache) {
      delete database.data.developerAnalyticsCache[repoPath];
      await database.write();
    }
    return null;
  }

  // Fallback: if we can't get commit hash, use time-based expiration as safety net
  const cachedAt = new Date(cached.cachedAt).getTime();
  const now = Date.now();
  const age = now - cachedAt;

  if (age > maxAgeMs) {
    // Cache expired (fallback when commit hash unavailable)
    if (database.data.developerAnalyticsCache) {
      delete database.data.developerAnalyticsCache[repoPath];
      await database.write();
    }
    return null;
  }

  return cached.analytics;
}

export async function setCachedDeveloperAnalytics(repoPath: string, analytics: any): Promise<void> {
  const database = await getDb();
  if (!database.data.developerAnalyticsCache) {
    database.data.developerAnalyticsCache = {};
  }
  // Get the latest commit hash when caching
  const latestCommitHash = await getLatestCommitHash(repoPath);
  database.data.developerAnalyticsCache[repoPath] = {
    analytics,
    cachedAt: new Date().toISOString(),
    repoPath,
    latestCommitHash: latestCommitHash || undefined,
  };
  await database.write();
}

export async function getCachedRiskAnalytics(
  repoPath: string,
  maxAgeMs: number = 2592000000
): Promise<any | null> {
  // maxAgeMs defaults to 30 days (2592000000ms) - used as fallback when commit hash unavailable
  const database = await getDb();
  const cached = database.data.riskAnalyticsCache?.[repoPath];

  if (!cached) {
    return null;
  }

  // Check if repository has new commits since cache was created
  const currentCommitHash = await getLatestCommitHash(repoPath);

  // If we can't get commit hash and we previously had one, repository might be deleted/invalid
  if (!currentCommitHash && cached.latestCommitHash) {
    // Repository no longer exists or is invalid, invalidate cache
    if (database.data.riskAnalyticsCache) {
      delete database.data.riskAnalyticsCache[repoPath];
      await database.write();
    }
    return null;
  }

  if (currentCommitHash && cached.latestCommitHash) {
    if (currentCommitHash !== cached.latestCommitHash) {
      // Repository has new commits, invalidate cache
      if (database.data.riskAnalyticsCache) {
        delete database.data.riskAnalyticsCache[repoPath];
        await database.write();
      }
      return null;
    }
    // Commit hash matches - cache is still valid (no time check needed)
    return cached.analytics;
  } else if (currentCommitHash && !cached.latestCommitHash) {
    // Cache was created before we started tracking commit hashes
    // Invalidate it to ensure we get fresh data with commit hash tracking
    if (database.data.riskAnalyticsCache) {
      delete database.data.riskAnalyticsCache[repoPath];
      await database.write();
    }
    return null;
  }

  // Fallback: if we can't get commit hash, use time-based expiration as safety net
  const cachedAt = new Date(cached.cachedAt).getTime();
  const now = Date.now();
  const age = now - cachedAt;

  if (age > maxAgeMs) {
    // Cache expired (fallback when commit hash unavailable)
    if (database.data.riskAnalyticsCache) {
      delete database.data.riskAnalyticsCache[repoPath];
      await database.write();
    }
    return null;
  }

  return cached.analytics;
}

export async function setCachedRiskAnalytics(repoPath: string, analytics: any): Promise<void> {
  const database = await getDb();
  if (!database.data.riskAnalyticsCache) {
    database.data.riskAnalyticsCache = {};
  }
  // Get the latest commit hash when caching
  const latestCommitHash = await getLatestCommitHash(repoPath);
  database.data.riskAnalyticsCache[repoPath] = {
    analytics,
    cachedAt: new Date().toISOString(),
    repoPath,
    latestCommitHash: latestCommitHash || undefined,
  };
  await database.write();
}

export async function getCachedBusFactorAndOwnership(
  repoPath: string,
  maxAgeMs: number = 2592000000
): Promise<any | null> {
  // maxAgeMs defaults to 30 days (2592000000ms) - used as fallback when commit hash unavailable
  const database = await getDb();
  const cached = database.data.busFactorCache?.[repoPath];

  if (!cached) {
    return null;
  }

  // Check if repository has new commits since cache was created
  const currentCommitHash = await getLatestCommitHash(repoPath);

  // If we can't get commit hash and we previously had one, repository might be deleted/invalid
  if (!currentCommitHash && cached.latestCommitHash) {
    // Repository no longer exists or is invalid, invalidate cache
    if (database.data.busFactorCache) {
      delete database.data.busFactorCache[repoPath];
      await database.write();
    }
    return null;
  }

  if (currentCommitHash && cached.latestCommitHash) {
    if (currentCommitHash !== cached.latestCommitHash) {
      // Repository has new commits, invalidate cache
      if (database.data.busFactorCache) {
        delete database.data.busFactorCache[repoPath];
        await database.write();
      }
      return null;
    }
    // Commit hash matches - cache is still valid (no time check needed)
    return cached.analytics;
  } else if (currentCommitHash && !cached.latestCommitHash) {
    // Cache was created before we started tracking commit hashes
    // Invalidate it to ensure we get fresh data with commit hash tracking
    if (database.data.busFactorCache) {
      delete database.data.busFactorCache[repoPath];
      await database.write();
    }
    return null;
  }

  // Fallback: if we can't get commit hash, use time-based expiration as safety net
  const cachedAt = new Date(cached.cachedAt).getTime();
  const now = Date.now();
  const age = now - cachedAt;

  if (age > maxAgeMs) {
    // Cache expired (fallback when commit hash unavailable)
    if (database.data.busFactorCache) {
      delete database.data.busFactorCache[repoPath];
      await database.write();
    }
    return null;
  }

  return cached.analytics;
}

export async function setCachedBusFactorAndOwnership(
  repoPath: string,
  analytics: any
): Promise<void> {
  const database = await getDb();
  if (!database.data.busFactorCache) {
    database.data.busFactorCache = {};
  }
  // Get the latest commit hash when caching
  const latestCommitHash = await getLatestCommitHash(repoPath);
  database.data.busFactorCache[repoPath] = {
    analytics,
    cachedAt: new Date().toISOString(),
    repoPath,
    latestCommitHash: latestCommitHash || undefined,
  };
  await database.write();
}

export async function getCachedRepositoryEvolution(
  repoPath: string,
  maxAgeMs: number = 2592000000
): Promise<any | null> {
  // maxAgeMs defaults to 30 days (2592000000ms) - used as fallback when commit hash unavailable
  const database = await getDb();
  const cached = database.data.repositoryEvolutionCache?.[repoPath];

  if (!cached) {
    return null;
  }

  // Check if repository has new commits since cache was created
  const currentCommitHash = await getLatestCommitHash(repoPath);

  // If we can't get commit hash and we previously had one, repository might be deleted/invalid
  if (!currentCommitHash && cached.latestCommitHash) {
    // Repository no longer exists or is invalid, invalidate cache
    if (database.data.repositoryEvolutionCache) {
      delete database.data.repositoryEvolutionCache[repoPath];
      await database.write();
    }
    return null;
  }

  if (currentCommitHash && cached.latestCommitHash) {
    if (currentCommitHash !== cached.latestCommitHash) {
      // Repository has new commits, invalidate cache
      if (database.data.repositoryEvolutionCache) {
        delete database.data.repositoryEvolutionCache[repoPath];
        await database.write();
      }
      return null;
    }
    // Commit hash matches - cache is still valid (no time check needed)
    return cached.evolution;
  } else if (currentCommitHash && !cached.latestCommitHash) {
    // Cache was created before we started tracking commit hashes
    // Invalidate it to ensure we get fresh data with commit hash tracking
    if (database.data.repositoryEvolutionCache) {
      delete database.data.repositoryEvolutionCache[repoPath];
      await database.write();
    }
    return null;
  }

  // Fallback: if we can't get commit hash, use time-based expiration as safety net
  const cachedAt = new Date(cached.cachedAt).getTime();
  const now = Date.now();
  const age = now - cachedAt;

  if (age > maxAgeMs) {
    // Cache expired (fallback when commit hash unavailable)
    if (database.data.repositoryEvolutionCache) {
      delete database.data.repositoryEvolutionCache[repoPath];
      await database.write();
    }
    return null;
  }

  return cached.evolution;
}

export async function setCachedRepositoryEvolution(
  repoPath: string,
  evolution: any
): Promise<void> {
  const database = await getDb();
  if (!database.data.repositoryEvolutionCache) {
    database.data.repositoryEvolutionCache = {};
  }
  // Get the latest commit hash when caching
  const latestCommitHash = await getLatestCommitHash(repoPath);
  database.data.repositoryEvolutionCache[repoPath] = {
    evolution,
    cachedAt: new Date().toISOString(),
    repoPath,
    latestCommitHash: latestCommitHash || undefined,
  };
  await database.write();
}

export async function getCachedSocialNetworkAnalysis(
  repoPath: string,
  maxAgeMs: number = 2592000000
): Promise<any | null> {
  // maxAgeMs defaults to 30 days (2592000000ms) - used as fallback when commit hash unavailable
  const database = await getDb();
  const cached = database.data.socialNetworkAnalysisCache?.[repoPath];

  if (!cached) {
    return null;
  }

  // Check if repository has new commits since cache was created
  const currentCommitHash = await getLatestCommitHash(repoPath);

  // If we can't get commit hash and we previously had one, repository might be deleted/invalid
  if (!currentCommitHash && cached.latestCommitHash) {
    // Repository no longer exists or is invalid, invalidate cache
    if (database.data.socialNetworkAnalysisCache) {
      delete database.data.socialNetworkAnalysisCache[repoPath];
      await database.write();
    }
    return null;
  }

  if (currentCommitHash && cached.latestCommitHash) {
    if (currentCommitHash !== cached.latestCommitHash) {
      // Repository has new commits, invalidate cache
      if (database.data.socialNetworkAnalysisCache) {
        delete database.data.socialNetworkAnalysisCache[repoPath];
        await database.write();
      }
      return null;
    }
    // Commit hash matches - cache is still valid (no time check needed)
    return cached.analysis;
  } else if (currentCommitHash && !cached.latestCommitHash) {
    // Cache was created before we started tracking commit hashes
    // Invalidate it to ensure we get fresh data with commit hash tracking
    if (database.data.socialNetworkAnalysisCache) {
      delete database.data.socialNetworkAnalysisCache[repoPath];
      await database.write();
    }
    return null;
  }

  // Fallback: if we can't get commit hash, use time-based expiration as safety net
  const cachedAt = new Date(cached.cachedAt).getTime();
  const now = Date.now();
  const age = now - cachedAt;

  if (age > maxAgeMs) {
    // Cache expired (fallback when commit hash unavailable)
    if (database.data.socialNetworkAnalysisCache) {
      delete database.data.socialNetworkAnalysisCache[repoPath];
      await database.write();
    }
    return null;
  }

  return cached.analysis;
}

export async function setCachedSocialNetworkAnalysis(
  repoPath: string,
  analysis: any
): Promise<void> {
  const database = await getDb();
  if (!database.data.socialNetworkAnalysisCache) {
    database.data.socialNetworkAnalysisCache = {};
  }
  // Get the latest commit hash when caching
  const latestCommitHash = await getLatestCommitHash(repoPath);
  database.data.socialNetworkAnalysisCache[repoPath] = {
    analysis,
    cachedAt: new Date().toISOString(),
    repoPath,
    latestCommitHash: latestCommitHash || undefined,
  };
  await database.write();
}

export async function clearCache(repoPath?: string): Promise<void> {
  const database = await getDb();
  if (repoPath) {
    delete database.data.analysisCache[repoPath];
    delete database.data.codebaseHealthCache[repoPath];
    if (database.data.technicalDebtCache) {
      delete database.data.technicalDebtCache[repoPath];
    }
    if (database.data.developerAnalyticsCache) {
      delete database.data.developerAnalyticsCache[repoPath];
    }
    if (database.data.riskAnalyticsCache) {
      delete database.data.riskAnalyticsCache[repoPath];
    }
    if (database.data.busFactorCache) {
      delete database.data.busFactorCache[repoPath];
    }
    if (database.data.repositoryEvolutionCache) {
      delete database.data.repositoryEvolutionCache[repoPath];
    }
    if (database.data.socialNetworkAnalysisCache) {
      delete database.data.socialNetworkAnalysisCache[repoPath];
    }
    // Clear AI insights cache for this repository (all analysis types)
    if (database.data.aiInsightsCache) {
      Object.keys(database.data.aiInsightsCache).forEach((key) => {
        if (key.startsWith(`${repoPath}:`)) {
          delete database.data.aiInsightsCache![key];
        }
      });
    }
  } else {
    database.data.analysisCache = {};
    database.data.codebaseHealthCache = {};
    if (database.data.technicalDebtCache) {
      database.data.technicalDebtCache = {};
    }
    if (database.data.developerAnalyticsCache) {
      database.data.developerAnalyticsCache = {};
    }
    if (database.data.riskAnalyticsCache) {
      database.data.riskAnalyticsCache = {};
    }
    if (database.data.busFactorCache) {
      database.data.busFactorCache = {};
    }
    if (database.data.repositoryEvolutionCache) {
      database.data.repositoryEvolutionCache = {};
    }
    if (database.data.socialNetworkAnalysisCache) {
      database.data.socialNetworkAnalysisCache = {};
    }
    if (database.data.aiInsightsCache) {
      database.data.aiInsightsCache = {};
    }
  }
  await database.write();
}

export async function getCachedCodebaseHealth(
  repoPath: string,
  maxAgeMs: number = 2592000000
): Promise<any | null> {
  // maxAgeMs defaults to 30 days (2592000000ms) - used as fallback when commit hash unavailable
  const database = await getDb();
  const cached = database.data.codebaseHealthCache[repoPath];

  if (!cached) {
    return null;
  }

  // Check if repository has new commits since cache was created
  const currentCommitHash = await getLatestCommitHash(repoPath);

  // If we can't get commit hash and we previously had one, repository might be deleted/invalid
  if (!currentCommitHash && cached.latestCommitHash) {
    // Repository no longer exists or is invalid, invalidate cache
    delete database.data.codebaseHealthCache[repoPath];
    await database.write();
    return null;
  }

  if (currentCommitHash && cached.latestCommitHash) {
    if (currentCommitHash !== cached.latestCommitHash) {
      // Repository has new commits, invalidate cache
      delete database.data.codebaseHealthCache[repoPath];
      await database.write();
      return null;
    }
    // Commit hash matches - cache is still valid (no time check needed)
    return cached.health;
  } else if (currentCommitHash && !cached.latestCommitHash) {
    // Cache was created before we started tracking commit hashes
    // Invalidate it to ensure we get fresh data with commit hash tracking
    delete database.data.codebaseHealthCache[repoPath];
    await database.write();
    return null;
  }

  // Fallback: if we can't get commit hash, use time-based expiration as safety net
  const cachedAt = new Date(cached.cachedAt).getTime();
  const now = Date.now();
  const age = now - cachedAt;

  if (age > maxAgeMs) {
    // Cache expired (fallback when commit hash unavailable)
    delete database.data.codebaseHealthCache[repoPath];
    await database.write();
    return null;
  }

  return cached.health;
}

export async function setCachedCodebaseHealth(repoPath: string, health: any): Promise<void> {
  const database = await getDb();
  // Get the latest commit hash when caching
  const latestCommitHash = await getLatestCommitHash(repoPath);
  database.data.codebaseHealthCache[repoPath] = {
    health,
    cachedAt: new Date().toISOString(),
    repoPath,
    latestCommitHash: latestCommitHash || undefined,
  };
  await database.write();
}

export async function getCachedTechnicalDebtIndicators(
  repoPath: string,
  maxAgeMs: number = 2592000000
): Promise<any | null> {
  // maxAgeMs defaults to 30 days (2592000000ms) - used as fallback when commit hash unavailable
  const database = await getDb();
  const cached = database.data.technicalDebtCache?.[repoPath];

  if (!cached) {
    return null;
  }

  // Check if repository has new commits since cache was created
  const currentCommitHash = await getLatestCommitHash(repoPath);

  // If we can't get commit hash and we previously had one, repository might be deleted/invalid
  if (!currentCommitHash && cached.latestCommitHash) {
    // Repository no longer exists or is invalid, invalidate cache
    if (database.data.technicalDebtCache) {
      delete database.data.technicalDebtCache[repoPath];
      await database.write();
    }
    return null;
  }

  if (currentCommitHash && cached.latestCommitHash) {
    if (currentCommitHash !== cached.latestCommitHash) {
      // Repository has new commits, invalidate cache
      if (database.data.technicalDebtCache) {
        delete database.data.technicalDebtCache[repoPath];
        await database.write();
      }
      return null;
    }
    // Commit hash matches - cache is still valid (no time check needed)
    return cached.indicators;
  } else if (currentCommitHash && !cached.latestCommitHash) {
    // Cache was created before we started tracking commit hashes
    // Invalidate it to ensure we get fresh data with commit hash tracking
    if (database.data.technicalDebtCache) {
      delete database.data.technicalDebtCache[repoPath];
      await database.write();
    }
    return null;
  }

  // Fallback: if we can't get commit hash, use time-based expiration as safety net
  const cachedAt = new Date(cached.cachedAt).getTime();
  const now = Date.now();
  const age = now - cachedAt;

  if (age > maxAgeMs) {
    // Cache expired (fallback when commit hash unavailable)
    if (database.data.technicalDebtCache) {
      delete database.data.technicalDebtCache[repoPath];
      await database.write();
    }
    return null;
  }

  return cached.indicators;
}

export async function setCachedTechnicalDebtIndicators(
  repoPath: string,
  indicators: any
): Promise<void> {
  const database = await getDb();
  if (!database.data.technicalDebtCache) {
    database.data.technicalDebtCache = {};
  }
  // Get the latest commit hash when caching
  const latestCommitHash = await getLatestCommitHash(repoPath);
  database.data.technicalDebtCache[repoPath] = {
    indicators,
    cachedAt: new Date().toISOString(),
    repoPath,
    latestCommitHash: latestCommitHash || undefined,
  };
  await database.write();
}

/**
 * Get cached AI insights for a repository and analysis type
 * @param repoPath Repository path
 * @param analysisType Analysis type (e.g., 'codebase-health', 'developer-analytics')
 * @param maxAgeMs Maximum age in milliseconds (default: 24 hours)
 * @returns Cached AI insights or null if not found/expired
 */
export async function getCachedAIInsights(
  repoPath: string,
  analysisType: string,
  maxAgeMs: number = 86400000 // 24 hours default
): Promise<string | null> {
  const database = await getDb();
  if (!database.data.aiInsightsCache) {
    database.data.aiInsightsCache = {};
  }
  const cacheKey = `${repoPath}:${analysisType}`;
  const cached = database.data.aiInsightsCache[cacheKey];

  if (!cached) {
    return null;
  }

  // Check if repository has new commits since cache was created
  const currentCommitHash = await getLatestCommitHash(repoPath);

  // If we can't get commit hash and we previously had one, repository might be deleted/invalid
  if (!currentCommitHash && cached.latestCommitHash) {
    // Repository no longer exists or is invalid, invalidate cache
    delete database.data.aiInsightsCache[cacheKey];
    await database.write();
    return null;
  }

  if (currentCommitHash && cached.latestCommitHash) {
    if (currentCommitHash !== cached.latestCommitHash) {
      // Repository has new commits, invalidate cache
      delete database.data.aiInsightsCache[cacheKey];
      await database.write();
      return null;
    }
    // Commit hash matches - cache is still valid (no time check needed)
    return cached.insights;
  } else if (currentCommitHash && !cached.latestCommitHash) {
    // Cache was created before we started tracking commit hashes
    // Invalidate it to ensure we get fresh data with commit hash tracking
    delete database.data.aiInsightsCache[cacheKey];
    await database.write();
    return null;
  }

  // Fallback: if we can't get commit hash, use time-based expiration
  const cachedAt = new Date(cached.cachedAt).getTime();
  const now = Date.now();
  const age = now - cachedAt;

  if (age > maxAgeMs) {
    // Cache expired (fallback when commit hash unavailable)
    delete database.data.aiInsightsCache[cacheKey];
    await database.write();
    return null;
  }

  return cached.insights;
}

/**
 * Set cached AI insights for a repository and analysis type
 * @param repoPath Repository path
 * @param analysisType Analysis type (e.g., 'codebase-health', 'developer-analytics')
 * @param insights AI-generated insights
 */
export async function setCachedAIInsights(
  repoPath: string,
  analysisType: string,
  insights: string
): Promise<void> {
  const database = await getDb();
  if (!database.data.aiInsightsCache) {
    database.data.aiInsightsCache = {};
  }
  const cacheKey = `${repoPath}:${analysisType}`;
  // Get the latest commit hash when caching
  const latestCommitHash = await getLatestCommitHash(repoPath);
  database.data.aiInsightsCache[cacheKey] = {
    insights,
    cachedAt: new Date().toISOString(),
    repoPath,
    analysisType,
    latestCommitHash: latestCommitHash || undefined,
  };
  await database.write();
}
