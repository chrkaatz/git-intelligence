import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import repositoriesRouter from '../repositories';
import * as repositoriesDb from '../../db/repositories';
import * as projectsDb from '../../db/projects';
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
});
