import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import repositoriesRouter from '../repositories';
import * as repositoriesDb from '../../db/repositories';
import * as projectsDb from '../../db/projects';
import { createTestDb } from '../../db/__tests__/helpers';
import { getDb, resetDb } from '../../db/database';
import fs from 'fs';
import simpleGit from 'simple-git';

// Mock the database module
vi.mock('../../db/database', async () => {
  const actual = await vi.importActual('../../db/database');
  return {
    ...actual,
    getDb: vi.fn(),
  };
});

// Mock fs module
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    statSync: vi.fn(),
  },
}));

// Mock simple-git
vi.mock('simple-git', () => ({
  default: vi.fn(),
}));

// Mock cache module
vi.mock('../../db/cache', () => ({
  clearCache: vi.fn(),
}));

const mockGetDb = vi.mocked(getDb);
const mockFs = vi.mocked(fs);
const mockSimpleGit = vi.mocked(simpleGit);

const app = express();
app.use(express.json());
app.use('/repositories', repositoriesRouter);

describe('Repositories Routes', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
    testDb = createTestDb({
      projects: [],
      repositories: [],
      analysisCache: {},
      codebaseHealthCache: {},
      schemaVersion: 2,
    });
    mockGetDb.mockResolvedValue(testDb as any);
  });

  describe('GET /repositories', () => {
    it('should return all repositories', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo1 = await repositoriesDb.addRepository(project.id, '/path/to/repo1', 'Repo 1');
      const repo2 = await repositoriesDb.addRepository(project.id, '/path/to/repo2', 'Repo 2');

      const response = await request(app).get('/repositories');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body).toContainEqual(repo1);
      expect(response.body).toContainEqual(repo2);
    });

    it('should filter repositories by projectId', async () => {
      const project1 = await projectsDb.addProject('Project 1');
      const project2 = await projectsDb.addProject('Project 2');
      const repo1 = await repositoriesDb.addRepository(project1.id, '/path/to/repo1', 'Repo 1');
      await repositoriesDb.addRepository(project2.id, '/path/to/repo2', 'Repo 2');

      const response = await request(app).get(`/repositories?projectId=${project1.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toEqual(repo1);
    });

    it('should return empty array when no repositories exist', async () => {
      const response = await request(app).get('/repositories');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockGetDb.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/repositories');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch repositories' });
    });
  });

  describe('GET /repositories/:id', () => {
    it('should return a repository by id', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      const response = await request(app).get(`/repositories/${repo.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(repo);
    });

    it('should return 404 when repository not found', async () => {
      const response = await request(app).get('/repositories/non-existent');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Repository not found' });
    });

    it('should handle database errors', async () => {
      mockGetDb.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/repositories/1');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch repository' });
    });
  });

  describe('POST /repositories', () => {
    it('should create a new repository', async () => {
      const project = await projectsDb.addProject('Test Project');

      const response = await request(app).post('/repositories').send({
        projectId: project.id,
        path: '/path/to/repo',
        name: 'Test Repo',
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        projectId: project.id,
        path: '/path/to/repo',
        name: 'Test Repo',
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });

    it('should return 400 when projectId is missing', async () => {
      const response = await request(app).post('/repositories').send({
        path: '/path/to/repo',
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Project ID is required' });
    });

    it('should return 400 when path is missing', async () => {
      const project = await projectsDb.addProject('Test Project');

      const response = await request(app).post('/repositories').send({
        projectId: project.id,
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Path is required' });
    });

    it('should handle database errors', async () => {
      mockGetDb.mockRejectedValue(new Error('Database error'));

      const response = await request(app).post('/repositories').send({
        projectId: 'project-id',
        path: '/path/to/repo',
      });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to add repository' });
    });
  });

  describe('DELETE /repositories/:id', () => {
    it('should delete a repository', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      const response = await request(app).delete(`/repositories/${repo.id}`);

      expect(response.status).toBe(204);

      const repositories = await repositoriesDb.getRepositories();
      expect(repositories).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      mockGetDb.mockRejectedValue(new Error('Database error'));

      const response = await request(app).delete('/repositories/1');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to remove repository' });
    });
  });

  describe('POST /repositories/:id/fetch', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return 404 when repository not found', async () => {
      const response = await request(app).post('/repositories/non-existent/fetch');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Repository not found' });
    });

    it('should return 400 when repository path does not exist', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      mockFs.existsSync.mockReturnValue(false);

      const response = await request(app).post(`/repositories/${repo.id}/fetch`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Repository path does not exist');
      expect(response.body.path).toBe('/path/to/repo');
    });

    it('should return 400 when repository path is not a directory', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => false } as any);

      const response = await request(app).post(`/repositories/${repo.id}/fetch`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Repository path is not a directory');
    });

    it('should return 400 when path is not a valid Git repository', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(false),
      };
      mockSimpleGit.mockReturnValue(mockGit as any);

      const response = await request(app).post(`/repositories/${repo.id}/fetch`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Path is not a valid Git repository');
    });

    it('should successfully fetch repository with changes', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        revparse: vi
          .fn()
          .mockResolvedValueOnce('abc123')
          .mockResolvedValueOnce('main')
          .mockResolvedValueOnce('def456'),
        fetch: vi.fn().mockResolvedValue(undefined),
        pull: vi.fn().mockResolvedValue({
          summary: { changes: 5, insertions: 10, deletions: 3 },
        }),
      };
      mockSimpleGit.mockReturnValue(mockGit as any);

      const response = await request(app).post(`/repositories/${repo.id}/fetch`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.changes.hasChanges).toBe(true);
      expect(response.body.changes.fetched).toBe(true);
      expect(response.body.changes.pulled).toBe(true);
      expect(response.body.changes.beforeHash).toBe('abc123');
      expect(response.body.changes.afterHash).toBe('def456');
    });

    it('should successfully fetch repository without changes', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        revparse: vi
          .fn()
          .mockResolvedValueOnce('abc123')
          .mockResolvedValueOnce('main')
          .mockResolvedValueOnce('abc123'),
        fetch: vi.fn().mockResolvedValue(undefined),
        pull: vi.fn().mockResolvedValue({
          summary: { changes: 0, insertions: 0, deletions: 0 },
        }),
      };
      mockSimpleGit.mockReturnValue(mockGit as any);

      const response = await request(app).post(`/repositories/${repo.id}/fetch`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.changes.hasChanges).toBe(false);
      expect(response.body.message).toContain('up to date');
    });

    it('should handle pull errors gracefully', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        revparse: vi
          .fn()
          .mockResolvedValueOnce('abc123')
          .mockResolvedValueOnce('main')
          .mockResolvedValueOnce('abc123'),
        fetch: vi.fn().mockResolvedValue(undefined),
        pull: vi.fn().mockRejectedValue(new Error('No upstream branch configured')),
      };
      mockSimpleGit.mockReturnValue(mockGit as any);

      const response = await request(app).post(`/repositories/${repo.id}/fetch`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.pullError).toContain('No upstream branch configured');
    });

    it('should handle git errors', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        revparse: vi.fn().mockRejectedValue(new Error('Git command failed')),
      };
      mockSimpleGit.mockReturnValue(mockGit as any);

      const response = await request(app).post(`/repositories/${repo.id}/fetch`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch repository changes');
      expect(response.body.details).toContain('Git command failed');
    });
  });
});
