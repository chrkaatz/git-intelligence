import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getRepositories,
  getRepository,
  addRepository,
  removeRepository,
} from '../repositories';
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

describe('repositories', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
    testDb = createTestDb();
    mockGetDb.mockResolvedValue(testDb as any);
  });

  describe('getRepositories', () => {
    it('should return empty array when no repositories exist', async () => {
      const repos = await getRepositories();
      expect(repos).toEqual([]);
    });

    it('should return all repositories when no projectId is provided', async () => {
      // Add projects directly to testDb
      const project1 = {
        id: 'project-1',
        name: 'Project 1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const project2 = {
        id: 'project-2',
        name: 'Project 2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      testDb.data.projects.push(project1, project2);
      await testDb.write();

      const repo1 = await addRepository(project1.id, '/repo1', 'Repo 1');
      const repo2 = await addRepository(project2.id, '/repo2', 'Repo 2');

      const repos = await getRepositories();
      expect(repos).toHaveLength(2);
      expect(repos.map((r) => r.id)).toContain(repo1.id);
      expect(repos.map((r) => r.id)).toContain(repo2.id);
    });

    it('should return only repositories for specified projectId', async () => {
      // Add projects directly to testDb
      const project1 = {
        id: 'project-1',
        name: 'Project 1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const project2 = {
        id: 'project-2',
        name: 'Project 2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      testDb.data.projects.push(project1, project2);
      await testDb.write();

      const repo1 = await addRepository(project1.id, '/repo1', 'Repo 1');
      const repo2 = await addRepository(project2.id, '/repo2', 'Repo 2');

      const repos = await getRepositories(project1.id);
      expect(repos).toHaveLength(1);
      expect(repos[0].id).toBe(repo1.id);
    });
  });

  describe('getRepository', () => {
    it('should return null when repository does not exist', async () => {
      const repo = await getRepository('non-existent');
      expect(repo).toBeNull();
    });

    it('should return repository when it exists', async () => {
      // Add project directly to testDb
      const project = {
        id: 'project-1',
        name: 'Test Project',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      testDb.data.projects.push(project);
      await testDb.write();

      const created = await addRepository(project.id, '/test/repo', 'Test Repo');

      const retrieved = await getRepository(created.id);
      expect(retrieved).toEqual(created);
    });
  });

  describe('addRepository', () => {
    it('should create a new repository with required fields', async () => {
      // Add project directly to testDb
      const project = {
        id: 'project-1',
        name: 'Test Project',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      testDb.data.projects = [project];
      testDb.data.repositories = [];
      await testDb.write();

      const repo = await addRepository(project.id, '/test/repo');

      expect(repo).toMatchObject({
        projectId: project.id,
        path: '/test/repo',
        name: 'repo', // basename of path
      });
      expect(repo.id).toBeDefined();
      expect(repo.createdAt).toBeDefined();
      expect(repo.updatedAt).toBeDefined();
    });

    it('should create repository with custom name', async () => {
      // Add project directly to testDb
      const project = {
        id: 'project-1',
        name: 'Test Project',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      testDb.data.projects = [project];
      testDb.data.repositories = [];
      await testDb.write();

      const repo = await addRepository(project.id, '/test/repo', 'Custom Name');

      expect(repo).toMatchObject({
        projectId: project.id,
        path: '/test/repo',
        name: 'Custom Name',
      });
    });

    it('should return existing repository if path already exists and replace is false', async () => {
      // Add project directly to testDb
      const project = {
        id: 'project-1',
        name: 'Test Project',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      testDb.data.projects = [project];
      testDb.data.repositories = [];
      await testDb.write();

      const existing = await addRepository(project.id, '/test/repo', 'Original Name');
      const duplicate = await addRepository(project.id, '/test/repo', 'New Name', false);

      expect(duplicate).toEqual(existing);
      expect(duplicate.name).toBe('Original Name');

      const repos = await getRepositories();
      expect(repos).toHaveLength(1);
    });

    it('should replace existing repository if path exists and replace is true', async () => {
      // Add projects directly to testDb
      const project1 = {
        id: 'project-1',
        name: 'Project 1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const project2 = {
        id: 'project-2',
        name: 'Project 2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      testDb.data.projects = [project1, project2];
      testDb.data.repositories = [];
      await testDb.write();

      const existing = await addRepository(project1.id, '/test/repo', 'Original Name');
      // Wait a bit to ensure updatedAt is different
      await new Promise((resolve) => setTimeout(resolve, 10));
      const replaced = await addRepository(project2.id, '/test/repo', 'New Name', true);

      expect(replaced.id).toBe(existing.id);
      expect(replaced.projectId).toBe(project2.id);
      expect(replaced.name).toBe('New Name');
      expect(replaced.updatedAt).not.toBe(existing.updatedAt);

      const repos = await getRepositories();
      expect(repos).toHaveLength(1);
    });

    it('should handle paths with different separators', async () => {
      // Add project directly to testDb
      const project = {
        id: 'project-1',
        name: 'Test Project',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      testDb.data.projects = [project];
      testDb.data.repositories = [];
      await testDb.write();

      const repo1 = await addRepository(project.id, '/path/to/repo', 'Repo 1');
      const repo2 = await addRepository(project.id, 'C:\\path\\to\\repo', 'Repo 2');

      expect(repo1.path).toBe('/path/to/repo');
      expect(repo2.path).toBe('C:\\path\\to\\repo');

      const repos = await getRepositories();
      expect(repos).toHaveLength(2);
    });
  });

  describe('removeRepository', () => {
    it('should remove repository and clear its cache', async () => {
      // Add project directly to testDb
      const project = {
        id: 'project-1',
        name: 'Test Project',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      testDb.data.projects = [project];
      testDb.data.repositories = [];
      testDb.data.analysisCache = {};
      testDb.data.codebaseHealthCache = {};
      await testDb.write();

      const repo = await addRepository(project.id, '/test/repo', 'Test Repo');

      // Add cache entries directly to testDb
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

      await removeRepository(repo.id);

      const repos = await getRepositories();
      expect(repos).toHaveLength(0);

      expect(testDb.data.analysisCache['/test/repo']).toBeUndefined();
      expect(testDb.data.codebaseHealthCache['/test/repo']).toBeUndefined();
    });

    it('should not throw when removing non-existent repository', async () => {
      testDb.data.repositories = [];
      await testDb.write();

      await expect(removeRepository('non-existent')).resolves.not.toThrow();
    });

    it('should only remove the specified repository', async () => {
      // Add project directly to testDb
      const project = {
        id: 'project-1',
        name: 'Test Project',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      testDb.data.projects = [project];
      testDb.data.repositories = [];
      await testDb.write();

      const repo1 = await addRepository(project.id, '/repo1', 'Repo 1');
      const repo2 = await addRepository(project.id, '/repo2', 'Repo 2');

      await removeRepository(repo1.id);

      const repos = await getRepositories();
      expect(repos).toHaveLength(1);
      expect(repos[0].id).toBe(repo2.id);
    });
  });
});

