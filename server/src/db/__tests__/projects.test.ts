import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getProjects,
  getProject,
  addProject,
  updateProject,
  removeProject,
} from '../projects';
import { getDb, resetDb } from '../database';
import { createTestDb } from './helpers';
import type { DatabaseSchema } from '../types';

// Mock the database module
vi.mock('../database', async () => {
  const actual = await vi.importActual('../database');
  return {
    ...actual,
    getDb: vi.fn(),
  };
});

const mockGetDb = vi.mocked(getDb);

describe('projects', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
    testDb = createTestDb();
    mockGetDb.mockResolvedValue(testDb as any);
  });

  describe('getProjects', () => {
    it('should return empty array when no projects exist', async () => {
      const projects = await getProjects();
      expect(projects).toEqual([]);
    });

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

      const projects = await getProjects();
      expect(projects).toHaveLength(2);
      expect(projects).toContainEqual(project1);
      expect(projects).toContainEqual(project2);
    });
  });

  describe('getProject', () => {
    it('should return null when project does not exist', async () => {
      const project = await getProject('non-existent');
      expect(project).toBeNull();
    });

    it('should return project when it exists', async () => {
      const project = {
        id: '1',
        name: 'Test Project',
        description: 'Test Description',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      testDb.data.projects = [project];
      await testDb.write();

      const result = await getProject('1');
      expect(result).toEqual(project);
    });
  });

  describe('addProject', () => {
    it('should create a new project with required fields', async () => {
      testDb.data.projects = [];
      await testDb.write();

      const project = await addProject('New Project');

      expect(project).toMatchObject({
        name: 'New Project',
      });
      expect(project.id).toBeDefined();
      expect(project.createdAt).toBeDefined();
      expect(project.updatedAt).toBeDefined();

      const projects = await getProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0]).toEqual(project);
    });

    it('should create a new project with description', async () => {
      testDb.data.projects = [];
      await testDb.write();

      const project = await addProject('New Project', 'Project description');

      expect(project).toMatchObject({
        name: 'New Project',
        description: 'Project description',
      });

      const projects = await getProjects();
      expect(projects[0]).toEqual(project);
    });

    it('should return existing project if name already exists', async () => {
      testDb.data.projects = [];
      await testDb.write();

      const existing = await addProject('Existing Project');
      const duplicate = await addProject('Existing Project');

      expect(duplicate).toEqual(existing);

      const projects = await getProjects();
      expect(projects).toHaveLength(1);
    });
  });

  describe('updateProject', () => {
    it('should return null when project does not exist', async () => {
      testDb.data.projects = [];
      await testDb.write();

      const result = await updateProject('non-existent', { name: 'Updated' });
      expect(result).toBeNull();
    });

    it('should update project name', async () => {
      testDb.data.projects = [];
      await testDb.write();

      const project = await addProject('Original Name');
      // Wait a bit to ensure updatedAt is different
      await new Promise((resolve) => setTimeout(resolve, 10));
      const updated = await updateProject(project.id, { name: 'Updated Name' });

      expect(updated).toMatchObject({
        id: project.id,
        name: 'Updated Name',
      });
      expect(updated?.updatedAt).not.toBe(project.updatedAt);

      const retrieved = await getProject(project.id);
      expect(retrieved?.name).toBe('Updated Name');
    });

    it('should update project description', async () => {
      const project = await addProject('Test Project', 'Original Description');
      const updated = await updateProject(project.id, { description: 'Updated Description' });

      expect(updated).toMatchObject({
        id: project.id,
        description: 'Updated Description',
      });

      const retrieved = await getProject(project.id);
      expect(retrieved?.description).toBe('Updated Description');
    });

    it('should update both name and description', async () => {
      const project = await addProject('Original Name', 'Original Description');
      const updated = await updateProject(project.id, {
        name: 'Updated Name',
        description: 'Updated Description',
      });

      expect(updated).toMatchObject({
        id: project.id,
        name: 'Updated Name',
        description: 'Updated Description',
      });
    });
  });

  describe('removeProject', () => {
    it('should remove project and its repositories', async () => {
      testDb.data.projects = [];
      testDb.data.repositories = [];
      await testDb.write();

      const project = await addProject('Test Project');

      // Add repository directly to testDb
      const repo = {
        id: 'repo-1',
        projectId: project.id,
        path: '/test/repo',
        name: 'Test Repo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      testDb.data.repositories.push(repo);
      await testDb.write();

      await removeProject(project.id);

      const projects = await getProjects();
      expect(projects).toHaveLength(0);

      expect(testDb.data.repositories).toHaveLength(0);
    });

    it('should clear cache for removed project repositories', async () => {
      const project = await addProject('Test Project');

      // Add repository and cache entries directly to testDb
      const repo = {
        id: 'repo-1',
        projectId: project.id,
        path: '/test/repo',
        name: 'Test Repo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      testDb.data.repositories.push(repo);
      testDb.data.analysisCache['/test/repo'] = {
        stats: { test: 'stats' },
        cachedAt: new Date().toISOString(),
        repoPath: '/test/repo',
      };
      testDb.data.codebaseHealthCache['/test/repo'] = {
        health: { test: 'health' },
        cachedAt: new Date().toISOString(),
        repoPath: '/test/repo',
      };
      await testDb.write();

      await removeProject(project.id);

      expect(testDb.data.analysisCache['/test/repo']).toBeUndefined();
      expect(testDb.data.codebaseHealthCache['/test/repo']).toBeUndefined();
    });

    it('should not throw when removing non-existent project', async () => {
      await expect(removeProject('non-existent')).resolves.not.toThrow();
    });
  });
});

