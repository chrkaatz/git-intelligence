import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import projectsRouter from '../projects';
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
app.use('/projects', projectsRouter);

describe('Projects Routes', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
    testDb = createTestDb();
    mockGetDb.mockResolvedValue(testDb as any);
  });

  describe('GET /projects', () => {
    it('should return all projects', async () => {
      const project1 = {
        id: '1',
        name: 'Project 1',
        description: 'Description 1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      const project2 = {
        id: '2',
        name: 'Project 2',
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      testDb.data.projects = [project1, project2];
      await testDb.write();

      const response = await request(app).get('/projects');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body).toContainEqual(project1);
      expect(response.body).toContainEqual(project2);
    });

    it('should return empty array when no projects exist', async () => {
      const response = await request(app).get('/projects');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockGetDb.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/projects');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch projects' });
    });
  });

  describe('GET /projects/:id', () => {
    it('should return a project by id', async () => {
      const project = {
        id: '1',
        name: 'Test Project',
        description: 'Test Description',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      testDb.data.projects = [project];
      await testDb.write();

      const response = await request(app).get('/projects/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(project);
    });

    it('should return 404 when project not found', async () => {
      const response = await request(app).get('/projects/non-existent');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Project not found' });
    });

    it('should handle database errors', async () => {
      mockGetDb.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/projects/1');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch project' });
    });
  });

  describe('POST /projects', () => {
    it('should create a new project', async () => {
      const response = await request(app).post('/projects').send({
        name: 'New Project',
        description: 'Project description',
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        name: 'New Project',
        description: 'Project description',
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });

    it('should create a project without description', async () => {
      const response = await request(app).post('/projects').send({
        name: 'New Project',
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        name: 'New Project',
      });
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app).post('/projects').send({
        description: 'Description without name',
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Name is required' });
    });

    it('should return 400 when name is not a string', async () => {
      const response = await request(app).post('/projects').send({
        name: 123,
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Name is required' });
    });

    it('should handle database errors', async () => {
      mockGetDb.mockRejectedValue(new Error('Database error'));

      const response = await request(app).post('/projects').send({
        name: 'New Project',
      });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to add project' });
    });
  });

  describe('PUT /projects/:id', () => {
    it('should update a project', async () => {
      const project = await projectsDb.addProject('Original Name', 'Original Description');
      testDb.data.projects = [project];
      await testDb.write();

      const response = await request(app).put(`/projects/${project.id}`).send({
        name: 'Updated Name',
        description: 'Updated Description',
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: project.id,
        name: 'Updated Name',
        description: 'Updated Description',
      });
    });

    it('should return 404 when project not found', async () => {
      const response = await request(app).put('/projects/non-existent').send({
        name: 'Updated Name',
      });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Project not found' });
    });

    it('should handle database errors', async () => {
      mockGetDb.mockRejectedValue(new Error('Database error'));

      const response = await request(app).put('/projects/1').send({
        name: 'Updated Name',
      });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to update project' });
    });
  });

  describe('DELETE /projects/:id', () => {
    it('should delete a project', async () => {
      const project = await projectsDb.addProject('Test Project');
      testDb.data.projects = [project];
      await testDb.write();

      const response = await request(app).delete(`/projects/${project.id}`);

      expect(response.status).toBe(204);

      const projects = await projectsDb.getProjects();
      expect(projects).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      mockGetDb.mockRejectedValue(new Error('Database error'));

      const response = await request(app).delete('/projects/1');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to remove project' });
    });
  });
});
