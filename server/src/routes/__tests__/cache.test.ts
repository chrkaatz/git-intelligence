import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cacheRouter from '../cache';
import * as repositoriesDb from '../../db/repositories';
import * as projectsDb from '../../db/projects';
import * as cacheDb from '../../db/cache';
import { createTestDb } from '../../db/__tests__/helpers';
import { getDb, resetDb } from '../../db/database';

// Mock the database module
vi.mock('../../db/database', async () => {
  const actual = await vi.importActual('../../db/database');
  return {
    ...actual,
    getDb: vi.fn(),
  };
});

const mockGetDb = vi.mocked(getDb);

const app = express();
app.use(express.json());
app.use('/cache', cacheRouter);

describe('Cache Routes', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
    testDb = createTestDb();
    mockGetDb.mockResolvedValue(testDb as any);
  });

  describe('POST /cache/clear', () => {
    it('should clear cache for a specific repository', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      // Add some cache data
      await cacheDb.setCachedStats('/path/to/repo', { test: 'stats' } as any);

      const response = await request(app).post('/cache/clear').send({
        repoId: repo.id,
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Cache cleared for repository',
      });

      const cached = await cacheDb.getCachedStats('/path/to/repo');
      expect(cached).toBeNull();
    });

    it('should clear all cache when repoId is not provided', async () => {
      const project = await projectsDb.addProject('Test Project');
      await repositoriesDb.addRepository(project.id, '/path/to/repo1', 'Repo 1');
      await repositoriesDb.addRepository(project.id, '/path/to/repo2', 'Repo 2');

      // Add cache data
      await cacheDb.setCachedStats('/path/to/repo1', { test: 'stats1' } as any);
      await cacheDb.setCachedStats('/path/to/repo2', { test: 'stats2' } as any);

      const response = await request(app).post('/cache/clear').send({});

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'All cache cleared',
      });

      const cached1 = await cacheDb.getCachedStats('/path/to/repo1');
      const cached2 = await cacheDb.getCachedStats('/path/to/repo2');
      expect(cached1).toBeNull();
      expect(cached2).toBeNull();
    });

    it('should return 404 when repository not found', async () => {
      const response = await request(app).post('/cache/clear').send({
        repoId: 'non-existent',
      });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Repository not found' });
    });

    it('should handle database errors', async () => {
      mockGetDb.mockRejectedValue(new Error('Database error'));

      const response = await request(app).post('/cache/clear').send({
        repoId: 'repo-id',
      });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to clear cache' });
    });
  });
});
