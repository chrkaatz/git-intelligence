import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCachedStats,
  setCachedStats,
  clearCache,
  getCachedCodebaseHealth,
  setCachedCodebaseHealth,
  getCachedTechnicalDebtIndicators,
  setCachedTechnicalDebtIndicators,
  getCachedRiskAnalytics,
  setCachedRiskAnalytics,
  getCachedBusFactorAndOwnership,
  setCachedBusFactorAndOwnership,
  getCachedRepositoryEvolution,
  setCachedRepositoryEvolution,
  getCachedSocialNetworkAnalysis,
  setCachedSocialNetworkAnalysis,
} from '../cache';
import { getDb, resetDb } from '../database';
import { createTestDb } from './helpers';

// Mock the database module
vi.mock('../database', async () => {
  const actual = await vi.importActual('../database');
  return {
    ...actual,
    getDb: vi.fn(),
  };
});

// Mock the git utils module
vi.mock('../../git/utils', () => ({
  getLatestCommitHash: vi.fn(),
}));

import { getLatestCommitHash } from '../../git/utils';
const mockGetLatestCommitHash = vi.mocked(getLatestCommitHash);

const mockGetDb = vi.mocked(getDb);

describe('cache', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
    testDb = createTestDb();
    mockGetDb.mockResolvedValue(testDb as any);
    // Default mock: return a stable commit hash
    mockGetLatestCommitHash.mockResolvedValue('abc123def456');
  });

  describe('getCachedStats', () => {
    it('should return null when cache does not exist', async () => {
      const stats = await getCachedStats('/test/repo');
      expect(stats).toBeNull();
    });

    it('should return cached stats when they exist and are not expired', async () => {
      const testStats = { commits: 100, authors: 5 };
      await setCachedStats('/test/repo', testStats);

      const stats = await getCachedStats('/test/repo');
      expect(stats).toEqual(testStats);
    });

    it('should return null when cache is expired (time-based fallback)', async () => {
      const testStats = { commits: 100, authors: 5 };
      await setCachedStats('/test/repo', testStats);

      // Mock commit hash as unavailable to trigger time-based expiration
      mockGetLatestCommitHash.mockResolvedValue(null);

      // Use a very short maxAge (1ms) to force expiration
      const stats = await getCachedStats('/test/repo', 1);

      // Wait a bit to ensure expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      const expiredStats = await getCachedStats('/test/repo', 1);
      expect(expiredStats).toBeNull();
    });

    it('should use default maxAge of 30 days as fallback', async () => {
      const testStats = { commits: 100 };
      await setCachedStats('/test/repo', testStats);

      const stats = await getCachedStats('/test/repo');
      expect(stats).toEqual(testStats);
    });

    it('should return cached stats when commit hash matches', async () => {
      const testStats = { commits: 100 };
      await setCachedStats('/test/repo', testStats);

      // Same commit hash - cache should be valid
      mockGetLatestCommitHash.mockResolvedValue('abc123def456');
      const stats = await getCachedStats('/test/repo');
      expect(stats).toEqual(testStats);
    });

    it('should invalidate cache when commit hash changes', async () => {
      const testStats = { commits: 100 };
      await setCachedStats('/test/repo', testStats);

      // Different commit hash - cache should be invalidated
      mockGetLatestCommitHash.mockResolvedValue('new789commit');
      const stats = await getCachedStats('/test/repo');
      expect(stats).toBeNull();
    });

    it('should invalidate old cache without commit hash', async () => {
      // Manually create cache entry without commit hash (old format)
      const db = await getDb();
      db.data.analysisCache['/test/repo'] = {
        stats: { commits: 100 },
        cachedAt: new Date().toISOString(),
        repoPath: '/test/repo',
        // No latestCommitHash
      };
      await db.write();

      // Should invalidate old cache format
      mockGetLatestCommitHash.mockResolvedValue('abc123def456');
      const stats = await getCachedStats('/test/repo');
      expect(stats).toBeNull();
    });

    it('should invalidate cache when repository no longer exists', async () => {
      const testStats = { commits: 100 };
      await setCachedStats('/test/repo', testStats);

      // Repository was deleted - can't get commit hash anymore
      mockGetLatestCommitHash.mockResolvedValue(null);

      // Cache should be invalidated because repository no longer exists
      const stats = await getCachedStats('/test/repo');
      expect(stats).toBeNull();
    });

    it('should use time-based expiration when commit hash was never cached', async () => {
      // Manually create cache entry without commit hash (old format)
      const db = await getDb();
      db.data.analysisCache['/test/repo'] = {
        stats: { commits: 100 },
        cachedAt: new Date().toISOString(),
        repoPath: '/test/repo',
        // No latestCommitHash
      };
      await db.write();

      mockGetLatestCommitHash.mockResolvedValue(null);

      // Should still be valid (not expired yet)
      const stats = await getCachedStats('/test/repo');
      expect(stats).toEqual({ commits: 100 });

      // But should expire with very short TTL
      await new Promise((resolve) => setTimeout(resolve, 10));
      const expiredStats = await getCachedStats('/test/repo', 1);
      expect(expiredStats).toBeNull();
    });

    it('should store commit hash when setting cache', async () => {
      mockGetLatestCommitHash.mockResolvedValue('stored123hash');
      await setCachedStats('/test/repo', { commits: 100 });

      const db = await getDb();
      const cached = db.data.analysisCache['/test/repo'];
      expect(cached.latestCommitHash).toBe('stored123hash');
    });

    it('should handle different repository paths', async () => {
      const stats1 = { commits: 100 };
      const stats2 = { commits: 200 };

      await setCachedStats('/repo1', stats1);
      await setCachedStats('/repo2', stats2);

      expect(await getCachedStats('/repo1')).toEqual(stats1);
      expect(await getCachedStats('/repo2')).toEqual(stats2);
    });
  });

  describe('setCachedStats', () => {
    it('should store stats in cache', async () => {
      const testStats = { commits: 100, authors: 5 };
      await setCachedStats('/test/repo', testStats);

      const cached = await getCachedStats('/test/repo');
      expect(cached).toEqual(testStats);
    });

    it('should overwrite existing cache', async () => {
      await setCachedStats('/test/repo', { commits: 100 });
      await setCachedStats('/test/repo', { commits: 200 });

      const cached = await getCachedStats('/test/repo');
      expect(cached).toEqual({ commits: 200 });
    });

    it('should set cachedAt timestamp', async () => {
      await setCachedStats('/test/repo', { commits: 100 });

      const db = await getDb();
      const cached = db.data.analysisCache['/test/repo'];
      expect(cached.cachedAt).toBeDefined();
      expect(new Date(cached.cachedAt).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('getCachedCodebaseHealth', () => {
    it('should return null when cache does not exist', async () => {
      const health = await getCachedCodebaseHealth('/test/repo');
      expect(health).toBeNull();
    });

    it('should return cached health when it exists and is not expired', async () => {
      const testHealth = { score: 85, issues: [] };
      await setCachedCodebaseHealth('/test/repo', testHealth);

      const health = await getCachedCodebaseHealth('/test/repo');
      expect(health).toEqual(testHealth);
    });

    it('should return null when cache is expired (time-based fallback)', async () => {
      const testHealth = { score: 85 };
      await setCachedCodebaseHealth('/test/repo', testHealth);

      // Mock commit hash as unavailable to trigger time-based expiration
      mockGetLatestCommitHash.mockResolvedValue(null);

      // Wait a bit and use very short maxAge
      await new Promise((resolve) => setTimeout(resolve, 10));
      const expiredHealth = await getCachedCodebaseHealth('/test/repo', 1);

      expect(expiredHealth).toBeNull();
    });

    it('should use default maxAge of 30 days as fallback', async () => {
      const testHealth = { score: 85 };
      await setCachedCodebaseHealth('/test/repo', testHealth);

      const health = await getCachedCodebaseHealth('/test/repo');
      expect(health).toEqual(testHealth);
    });

    it('should return cached health when commit hash matches', async () => {
      const testHealth = { score: 85 };
      await setCachedCodebaseHealth('/test/repo', testHealth);

      mockGetLatestCommitHash.mockResolvedValue('abc123def456');
      const health = await getCachedCodebaseHealth('/test/repo');
      expect(health).toEqual(testHealth);
    });

    it('should invalidate cache when commit hash changes', async () => {
      const testHealth = { score: 85 };
      await setCachedCodebaseHealth('/test/repo', testHealth);

      mockGetLatestCommitHash.mockResolvedValue('new789commit');
      const health = await getCachedCodebaseHealth('/test/repo');
      expect(health).toBeNull();
    });
  });

  describe('setCachedCodebaseHealth', () => {
    it('should store health in cache', async () => {
      const testHealth = { score: 85, issues: [] };
      await setCachedCodebaseHealth('/test/repo', testHealth);

      const cached = await getCachedCodebaseHealth('/test/repo');
      expect(cached).toEqual(testHealth);
    });

    it('should overwrite existing cache', async () => {
      await setCachedCodebaseHealth('/test/repo', { score: 80 });
      await setCachedCodebaseHealth('/test/repo', { score: 90 });

      const cached = await getCachedCodebaseHealth('/test/repo');
      expect(cached).toEqual({ score: 90 });
    });
  });

  describe('clearCache', () => {
    it('should not throw when clearing non-existent cache', async () => {
      await expect(clearCache('/non-existent')).resolves.not.toThrow();
      await expect(clearCache()).resolves.not.toThrow();
    });
  });

  describe('getCachedTechnicalDebtIndicators', () => {
    it('should return null when cache does not exist', async () => {
      const indicators = await getCachedTechnicalDebtIndicators('/test/repo');
      expect(indicators).toBeNull();
    });

    it('should return cached indicators when commit hash matches', async () => {
      const testIndicators = { debtScore: 75 };
      await setCachedTechnicalDebtIndicators('/test/repo', testIndicators);

      mockGetLatestCommitHash.mockResolvedValue('abc123def456');
      const indicators = await getCachedTechnicalDebtIndicators('/test/repo');
      expect(indicators).toEqual(testIndicators);
    });

    it('should invalidate cache when commit hash changes', async () => {
      const testIndicators = { debtScore: 75 };
      await setCachedTechnicalDebtIndicators('/test/repo', testIndicators);

      mockGetLatestCommitHash.mockResolvedValue('new789commit');
      const indicators = await getCachedTechnicalDebtIndicators('/test/repo');
      expect(indicators).toBeNull();
    });

    it('should invalidate cache when repository no longer exists', async () => {
      const testIndicators = { debtScore: 75 };
      await setCachedTechnicalDebtIndicators('/test/repo', testIndicators);

      // Repository was deleted - can't get commit hash anymore
      mockGetLatestCommitHash.mockResolvedValue(null);

      // Cache should be invalidated because repository no longer exists
      const indicators = await getCachedTechnicalDebtIndicators('/test/repo');
      expect(indicators).toBeNull();
    });

    it('should use time-based expiration when commit hash was never cached', async () => {
      // Manually create cache entry without commit hash (old format)
      const db = await getDb();
      if (!db.data.technicalDebtCache) {
        db.data.technicalDebtCache = {};
      }
      db.data.technicalDebtCache['/test/repo'] = {
        indicators: { debtScore: 75 },
        cachedAt: new Date().toISOString(),
        repoPath: '/test/repo',
        // No latestCommitHash
      };
      await db.write();

      mockGetLatestCommitHash.mockResolvedValue(null);

      // Should still be valid (not expired yet)
      const indicators = await getCachedTechnicalDebtIndicators('/test/repo');
      expect(indicators).toEqual({ debtScore: 75 });

      // But should expire with very short TTL
      await new Promise((resolve) => setTimeout(resolve, 10));
      const expiredIndicators = await getCachedTechnicalDebtIndicators('/test/repo', 1);
      expect(expiredIndicators).toBeNull();
    });
  });

  describe('setCachedTechnicalDebtIndicators', () => {
    it('should store indicators with commit hash', async () => {
      mockGetLatestCommitHash.mockResolvedValue('stored456hash');
      await setCachedTechnicalDebtIndicators('/test/repo', { debtScore: 75 });

      const db = await getDb();
      const cached = db.data.technicalDebtCache?.['/test/repo'];
      expect(cached?.latestCommitHash).toBe('stored456hash');
      expect(cached?.indicators).toEqual({ debtScore: 75 });
    });
  });

  describe('getCachedRiskAnalytics', () => {
    it('should return null when cache does not exist', async () => {
      const analytics = await getCachedRiskAnalytics('/test/repo');
      expect(analytics).toBeNull();
    });

    it('should return cached analytics when commit hash matches', async () => {
      const testAnalytics = { highRiskHotspots: [] };
      await setCachedRiskAnalytics('/test/repo', testAnalytics);

      mockGetLatestCommitHash.mockResolvedValue('abc123def456');
      const analytics = await getCachedRiskAnalytics('/test/repo');
      expect(analytics).toEqual(testAnalytics);
    });

    it('should invalidate cache when commit hash changes', async () => {
      const testAnalytics = { highRiskHotspots: [] };
      await setCachedRiskAnalytics('/test/repo', testAnalytics);

      mockGetLatestCommitHash.mockResolvedValue('new789commit');
      const analytics = await getCachedRiskAnalytics('/test/repo');
      expect(analytics).toBeNull();
    });

    it('should invalidate cache when repository no longer exists', async () => {
      const testAnalytics = { highRiskHotspots: [] };
      await setCachedRiskAnalytics('/test/repo', testAnalytics);

      // Repository was deleted - can't get commit hash anymore
      mockGetLatestCommitHash.mockResolvedValue(null);

      // Cache should be invalidated because repository no longer exists
      const analytics = await getCachedRiskAnalytics('/test/repo');
      expect(analytics).toBeNull();
    });

    it('should use time-based expiration when commit hash was never cached', async () => {
      // Manually create cache entry without commit hash (old format)
      const db = await getDb();
      if (!db.data.riskAnalyticsCache) {
        db.data.riskAnalyticsCache = {};
      }
      db.data.riskAnalyticsCache['/test/repo'] = {
        analytics: { highRiskHotspots: [] },
        cachedAt: new Date().toISOString(),
        repoPath: '/test/repo',
        // No latestCommitHash
      };
      await db.write();

      mockGetLatestCommitHash.mockResolvedValue(null);

      // Should still be valid (not expired yet)
      const analytics = await getCachedRiskAnalytics('/test/repo');
      expect(analytics).toEqual({ highRiskHotspots: [] });

      // But should expire with very short TTL
      await new Promise((resolve) => setTimeout(resolve, 10));
      const expiredAnalytics = await getCachedRiskAnalytics('/test/repo', 1);
      expect(expiredAnalytics).toBeNull();
    });
  });

  describe('setCachedRiskAnalytics', () => {
    it('should store analytics with commit hash', async () => {
      mockGetLatestCommitHash.mockResolvedValue('stored789hash');
      await setCachedRiskAnalytics('/test/repo', { highRiskHotspots: [] });

      const db = await getDb();
      const cached = db.data.riskAnalyticsCache?.['/test/repo'];
      expect(cached?.latestCommitHash).toBe('stored789hash');
      expect(cached?.analytics).toEqual({ highRiskHotspots: [] });
    });
  });

  describe('getCachedBusFactorAndOwnership', () => {
    it('should return null when cache does not exist', async () => {
      const analytics = await getCachedBusFactorAndOwnership('/test/repo');
      expect(analytics).toBeNull();
    });

    it('should return cached analytics when commit hash matches', async () => {
      const testAnalytics = { singleMaintainerRisk: { files: [] } };
      await setCachedBusFactorAndOwnership('/test/repo', testAnalytics);

      mockGetLatestCommitHash.mockResolvedValue('abc123def456');
      const analytics = await getCachedBusFactorAndOwnership('/test/repo');
      expect(analytics).toEqual(testAnalytics);
    });

    it('should invalidate cache when commit hash changes', async () => {
      const testAnalytics = { singleMaintainerRisk: { files: [] } };
      await setCachedBusFactorAndOwnership('/test/repo', testAnalytics);

      mockGetLatestCommitHash.mockResolvedValue('new789commit');
      const analytics = await getCachedBusFactorAndOwnership('/test/repo');
      expect(analytics).toBeNull();
    });

    it('should invalidate cache when repository no longer exists', async () => {
      const testAnalytics = { singleMaintainerRisk: { files: [] } };
      await setCachedBusFactorAndOwnership('/test/repo', testAnalytics);

      // Repository was deleted - can't get commit hash anymore
      mockGetLatestCommitHash.mockResolvedValue(null);

      // Cache should be invalidated because repository no longer exists
      const analytics = await getCachedBusFactorAndOwnership('/test/repo');
      expect(analytics).toBeNull();
    });

    it('should use time-based expiration when commit hash was never cached', async () => {
      // Manually create cache entry without commit hash (old format)
      const db = await getDb();
      if (!db.data.busFactorCache) {
        db.data.busFactorCache = {};
      }
      db.data.busFactorCache['/test/repo'] = {
        analytics: { singleMaintainerRisk: { files: [] } },
        cachedAt: new Date().toISOString(),
        repoPath: '/test/repo',
        // No latestCommitHash
      };
      await db.write();

      mockGetLatestCommitHash.mockResolvedValue(null);

      // Should still be valid (not expired yet)
      const analytics = await getCachedBusFactorAndOwnership('/test/repo');
      expect(analytics).toEqual({ singleMaintainerRisk: { files: [] } });

      // But should expire with very short TTL
      await new Promise((resolve) => setTimeout(resolve, 10));
      const expiredAnalytics = await getCachedBusFactorAndOwnership('/test/repo', 1);
      expect(expiredAnalytics).toBeNull();
    });
  });

  describe('setCachedBusFactorAndOwnership', () => {
    it('should store analytics with commit hash', async () => {
      mockGetLatestCommitHash.mockResolvedValue('stored999hash');
      await setCachedBusFactorAndOwnership('/test/repo', { singleMaintainerRisk: { files: [] } });

      const db = await getDb();
      const cached = db.data.busFactorCache?.['/test/repo'];
      expect(cached?.latestCommitHash).toBe('stored999hash');
      expect(cached?.analytics).toEqual({ singleMaintainerRisk: { files: [] } });
    });
  });

  describe('getCachedRepositoryEvolution', () => {
    it('should return null when cache does not exist', async () => {
      const evolution = await getCachedRepositoryEvolution('/test/repo');
      expect(evolution).toBeNull();
    });

    it('should return cached evolution when commit hash matches', async () => {
      const testEvolution = { commitFrequency: [] };
      await setCachedRepositoryEvolution('/test/repo', testEvolution);

      mockGetLatestCommitHash.mockResolvedValue('abc123def456');
      const evolution = await getCachedRepositoryEvolution('/test/repo');
      expect(evolution).toEqual(testEvolution);
    });

    it('should invalidate cache when commit hash changes', async () => {
      const testEvolution = { commitFrequency: [] };
      await setCachedRepositoryEvolution('/test/repo', testEvolution);

      mockGetLatestCommitHash.mockResolvedValue('new789commit');
      const evolution = await getCachedRepositoryEvolution('/test/repo');
      expect(evolution).toBeNull();
    });

    it('should invalidate cache when repository no longer exists', async () => {
      const testEvolution = { commitFrequency: [] };
      await setCachedRepositoryEvolution('/test/repo', testEvolution);

      // Repository was deleted - can't get commit hash anymore
      mockGetLatestCommitHash.mockResolvedValue(null);

      // Cache should be invalidated because repository no longer exists
      const evolution = await getCachedRepositoryEvolution('/test/repo');
      expect(evolution).toBeNull();
    });

    it('should use time-based expiration when commit hash was never cached', async () => {
      // Manually create cache entry without commit hash (old format)
      const db = await getDb();
      if (!db.data.repositoryEvolutionCache) {
        db.data.repositoryEvolutionCache = {};
      }
      db.data.repositoryEvolutionCache['/test/repo'] = {
        evolution: { commitFrequency: [] },
        cachedAt: new Date().toISOString(),
        repoPath: '/test/repo',
        // No latestCommitHash
      };
      await db.write();

      mockGetLatestCommitHash.mockResolvedValue(null);

      // Should still be valid (not expired yet)
      const evolution = await getCachedRepositoryEvolution('/test/repo');
      expect(evolution).toEqual({ commitFrequency: [] });

      // But should expire with very short TTL
      await new Promise((resolve) => setTimeout(resolve, 10));
      const expiredEvolution = await getCachedRepositoryEvolution('/test/repo', 1);
      expect(expiredEvolution).toBeNull();
    });
  });

  describe('setCachedRepositoryEvolution', () => {
    it('should store evolution with commit hash', async () => {
      mockGetLatestCommitHash.mockResolvedValue('stored111hash');
      await setCachedRepositoryEvolution('/test/repo', { commitFrequency: [] });

      const db = await getDb();
      const cached = db.data.repositoryEvolutionCache?.['/test/repo'];
      expect(cached?.latestCommitHash).toBe('stored111hash');
      expect(cached?.evolution).toEqual({ commitFrequency: [] });
    });
  });

  describe('getCachedSocialNetworkAnalysis', () => {
    it('should return null when cache does not exist', async () => {
      const analysis = await getCachedSocialNetworkAnalysis('/test/repo');
      expect(analysis).toBeNull();
    });

    it('should return cached analysis when commit hash matches', async () => {
      const testAnalysis = { collaborationGraph: { nodes: [] } };
      await setCachedSocialNetworkAnalysis('/test/repo', testAnalysis);

      mockGetLatestCommitHash.mockResolvedValue('abc123def456');
      const analysis = await getCachedSocialNetworkAnalysis('/test/repo');
      expect(analysis).toEqual(testAnalysis);
    });

    it('should invalidate cache when commit hash changes', async () => {
      const testAnalysis = { collaborationGraph: { nodes: [] } };
      await setCachedSocialNetworkAnalysis('/test/repo', testAnalysis);

      mockGetLatestCommitHash.mockResolvedValue('new789commit');
      const analysis = await getCachedSocialNetworkAnalysis('/test/repo');
      expect(analysis).toBeNull();
    });

    it('should invalidate cache when repository no longer exists', async () => {
      const testAnalysis = { collaborationGraph: { nodes: [] } };
      await setCachedSocialNetworkAnalysis('/test/repo', testAnalysis);

      // Repository was deleted - can't get commit hash anymore
      mockGetLatestCommitHash.mockResolvedValue(null);

      // Cache should be invalidated because repository no longer exists
      const analysis = await getCachedSocialNetworkAnalysis('/test/repo');
      expect(analysis).toBeNull();
    });

    it('should use time-based expiration when commit hash was never cached', async () => {
      // Manually create cache entry without commit hash (old format)
      const db = await getDb();
      if (!db.data.socialNetworkAnalysisCache) {
        db.data.socialNetworkAnalysisCache = {};
      }
      db.data.socialNetworkAnalysisCache['/test/repo'] = {
        analysis: { collaborationGraph: { nodes: [] } },
        cachedAt: new Date().toISOString(),
        repoPath: '/test/repo',
        // No latestCommitHash
      };
      await db.write();

      mockGetLatestCommitHash.mockResolvedValue(null);

      // Should still be valid (not expired yet)
      const analysis = await getCachedSocialNetworkAnalysis('/test/repo');
      expect(analysis).toEqual({ collaborationGraph: { nodes: [] } });

      // But should expire with very short TTL
      await new Promise((resolve) => setTimeout(resolve, 10));
      const expiredAnalysis = await getCachedSocialNetworkAnalysis('/test/repo', 1);
      expect(expiredAnalysis).toBeNull();
    });
  });

  describe('setCachedSocialNetworkAnalysis', () => {
    it('should store analysis with commit hash', async () => {
      mockGetLatestCommitHash.mockResolvedValue('stored222hash');
      await setCachedSocialNetworkAnalysis('/test/repo', { collaborationGraph: { nodes: [] } });

      const db = await getDb();
      const cached = db.data.socialNetworkAnalysisCache?.['/test/repo'];
      expect(cached?.latestCommitHash).toBe('stored222hash');
      expect(cached?.analysis).toEqual({ collaborationGraph: { nodes: [] } });
    });
  });

  describe('clearCache', () => {
    it('should clear all cache types for specific repository', async () => {
      await setCachedStats('/repo1', { commits: 100 });
      await setCachedCodebaseHealth('/repo1', { score: 85 });
      await setCachedTechnicalDebtIndicators('/repo1', { debtScore: 75 });
      await setCachedRiskAnalytics('/repo1', { highRiskHotspots: [] });
      await setCachedBusFactorAndOwnership('/repo1', { singleMaintainerRisk: { files: [] } });
      await setCachedRepositoryEvolution('/repo1', { commitFrequency: [] });
      await setCachedSocialNetworkAnalysis('/repo1', { collaborationGraph: { nodes: [] } });

      await clearCache('/repo1');

      expect(await getCachedStats('/repo1')).toBeNull();
      expect(await getCachedCodebaseHealth('/repo1')).toBeNull();
      expect(await getCachedTechnicalDebtIndicators('/repo1')).toBeNull();
      expect(await getCachedRiskAnalytics('/repo1')).toBeNull();
      expect(await getCachedBusFactorAndOwnership('/repo1')).toBeNull();
      expect(await getCachedRepositoryEvolution('/repo1')).toBeNull();
      expect(await getCachedSocialNetworkAnalysis('/repo1')).toBeNull();
    });

    it('should clear all cache types when no repository path is provided', async () => {
      await setCachedStats('/repo1', { commits: 100 });
      await setCachedCodebaseHealth('/repo1', { score: 85 });
      await setCachedTechnicalDebtIndicators('/repo1', { debtScore: 75 });
      await setCachedRiskAnalytics('/repo1', { highRiskHotspots: [] });
      await setCachedBusFactorAndOwnership('/repo1', { singleMaintainerRisk: { files: [] } });
      await setCachedRepositoryEvolution('/repo1', { commitFrequency: [] });
      await setCachedSocialNetworkAnalysis('/repo1', { collaborationGraph: { nodes: [] } });

      await clearCache();

      expect(await getCachedStats('/repo1')).toBeNull();
      expect(await getCachedCodebaseHealth('/repo1')).toBeNull();
      expect(await getCachedTechnicalDebtIndicators('/repo1')).toBeNull();
      expect(await getCachedRiskAnalytics('/repo1')).toBeNull();
      expect(await getCachedBusFactorAndOwnership('/repo1')).toBeNull();
      expect(await getCachedRepositoryEvolution('/repo1')).toBeNull();
      expect(await getCachedSocialNetworkAnalysis('/repo1')).toBeNull();
    });
  });
});
