import { getDb } from './database.js';

export async function getCachedStats(
  repoPath: string,
  maxAgeMs: number = 3600000
): Promise<any | null> {
  // maxAgeMs defaults to 1 hour (3600000ms)
  const database = await getDb();
  const cached = database.data.analysisCache[repoPath];

  if (!cached) {
    return null;
  }

  const cachedAt = new Date(cached.cachedAt).getTime();
  const now = Date.now();
  const age = now - cachedAt;

  if (age > maxAgeMs) {
    // Cache expired, remove it
    delete database.data.analysisCache[repoPath];
    await database.write();
    return null;
  }

  return cached.stats;
}

export async function setCachedStats(repoPath: string, stats: any): Promise<void> {
  const database = await getDb();
  database.data.analysisCache[repoPath] = {
    stats,
    cachedAt: new Date().toISOString(),
    repoPath,
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
  } else {
    database.data.analysisCache = {};
    database.data.codebaseHealthCache = {};
    if (database.data.technicalDebtCache) {
      database.data.technicalDebtCache = {};
    }
  }
  await database.write();
}

export async function getCachedCodebaseHealth(
  repoPath: string,
  maxAgeMs: number = 3600000
): Promise<any | null> {
  // maxAgeMs defaults to 1 hour (3600000ms)
  const database = await getDb();
  const cached = database.data.codebaseHealthCache[repoPath];

  if (!cached) {
    return null;
  }

  const cachedAt = new Date(cached.cachedAt).getTime();
  const now = Date.now();
  const age = now - cachedAt;

  if (age > maxAgeMs) {
    // Cache expired, remove it
    delete database.data.codebaseHealthCache[repoPath];
    await database.write();
    return null;
  }

  return cached.health;
}

export async function setCachedCodebaseHealth(repoPath: string, health: any): Promise<void> {
  const database = await getDb();
  database.data.codebaseHealthCache[repoPath] = {
    health,
    cachedAt: new Date().toISOString(),
    repoPath,
  };
  await database.write();
}

export async function getCachedTechnicalDebtIndicators(
  repoPath: string,
  maxAgeMs: number = 3600000
): Promise<any | null> {
  // maxAgeMs defaults to 1 hour (3600000ms)
  const database = await getDb();
  const cached = database.data.technicalDebtCache?.[repoPath];

  if (!cached) {
    return null;
  }

  const cachedAt = new Date(cached.cachedAt).getTime();
  const now = Date.now();
  const age = now - cachedAt;

  if (age > maxAgeMs) {
    // Cache expired, remove it
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
  database.data.technicalDebtCache[repoPath] = {
    indicators,
    cachedAt: new Date().toISOString(),
    repoPath,
  };
  await database.write();
}
