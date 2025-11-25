import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCachedStats,
  setCachedStats,
  clearCache,
  getCachedCodebaseHealth,
  setCachedCodebaseHealth,
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

const mockGetDb = vi.mocked(getDb);

describe('cache', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
    testDb = createTestDb();
    mockGetDb.mockResolvedValue(testDb as any);
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

    it('should return null when cache is expired', async () => {
      const testStats = { commits: 100, authors: 5 };
      await setCachedStats('/test/repo', testStats);

      // Use a very short maxAge (1ms) to force expiration
      const stats = await getCachedStats('/test/repo', 1);

      // Wait a bit to ensure expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      const expiredStats = await getCachedStats('/test/repo', 1);
      expect(expiredStats).toBeNull();
    });

    it('should use default maxAge of 1 hour', async () => {
      const testStats = { commits: 100 };
      await setCachedStats('/test/repo', testStats);

      const stats = await getCachedStats('/test/repo');
      expect(stats).toEqual(testStats);
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

    it('should return null when cache is expired', async () => {
      const testHealth = { score: 85 };
      await setCachedCodebaseHealth('/test/repo', testHealth);

      // Wait a bit and use very short maxAge
      await new Promise((resolve) => setTimeout(resolve, 10));
      const expiredHealth = await getCachedCodebaseHealth('/test/repo', 1);

      expect(expiredHealth).toBeNull();
    });

    it('should use default maxAge of 1 hour', async () => {
      const testHealth = { score: 85 };
      await setCachedCodebaseHealth('/test/repo', testHealth);

      const health = await getCachedCodebaseHealth('/test/repo');
      expect(health).toEqual(testHealth);
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
    it('should clear cache for specific repository', async () => {
      await setCachedStats('/repo1', { commits: 100 });
      await setCachedStats('/repo2', { commits: 200 });
      await setCachedCodebaseHealth('/repo1', { score: 85 });
      await setCachedCodebaseHealth('/repo2', { score: 90 });

      await clearCache('/repo1');

      expect(await getCachedStats('/repo1')).toBeNull();
      expect(await getCachedCodebaseHealth('/repo1')).toBeNull();
      expect(await getCachedStats('/repo2')).toEqual({ commits: 200 });
      expect(await getCachedCodebaseHealth('/repo2')).toEqual({ score: 90 });
    });

    it('should clear all cache when no repository path is provided', async () => {
      await setCachedStats('/repo1', { commits: 100 });
      await setCachedStats('/repo2', { commits: 200 });
      await setCachedCodebaseHealth('/repo1', { score: 85 });
      await setCachedCodebaseHealth('/repo2', { score: 90 });

      await clearCache();

      expect(await getCachedStats('/repo1')).toBeNull();
      expect(await getCachedStats('/repo2')).toBeNull();
      expect(await getCachedCodebaseHealth('/repo1')).toBeNull();
      expect(await getCachedCodebaseHealth('/repo2')).toBeNull();
    });

    it('should not throw when clearing non-existent cache', async () => {
      await expect(clearCache('/non-existent')).resolves.not.toThrow();
      await expect(clearCache()).resolves.not.toThrow();
    });
  });
});
