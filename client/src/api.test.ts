import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import type { Project, Repository, GitStats } from './api';

// Mock axios before importing api module
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Create a mock axios instance
const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

describe('API Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock axios.create to return our mock instance
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
  });

  describe('Projects API', () => {
    it('getProjects should fetch all projects', async () => {
      const mockProjects: Project[] = [
        { id: '1', name: 'Project 1', description: 'Description 1' },
        { id: '2', name: 'Project 2' },
      ];

      mockAxiosInstance.get.mockResolvedValue({ data: mockProjects });

      // Dynamic import to get fresh module with mocked axios
      const { getProjects } = await import('./api');
      const result = await getProjects();

      expect(result).toEqual(mockProjects);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/projects');
    });

    it('getProject should fetch a single project by id', async () => {
      const mockProject: Project = { id: '1', name: 'Project 1' };

      mockAxiosInstance.get.mockResolvedValue({ data: mockProject });

      const { getProject } = await import('./api');
      const result = await getProject('1');

      expect(result).toEqual(mockProject);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/projects/1');
    });

    it('addProject should create a new project', async () => {
      const newProject: Project = { id: '1', name: 'New Project', description: 'Description' };

      mockAxiosInstance.post.mockResolvedValue({ data: newProject });

      const { addProject } = await import('./api');
      const result = await addProject('New Project', 'Description');

      expect(result).toEqual(newProject);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/projects', {
        name: 'New Project',
        description: 'Description',
      });
    });

    it('updateProject should update an existing project', async () => {
      const updatedProject: Project = { id: '1', name: 'Updated Project' };

      mockAxiosInstance.put.mockResolvedValue({ data: updatedProject });

      const { updateProject } = await import('./api');
      const result = await updateProject('1', { name: 'Updated Project' });

      expect(result).toEqual(updatedProject);
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/projects/1', {
        name: 'Updated Project',
      });
    });

    it('removeProject should delete a project', async () => {
      mockAxiosInstance.delete.mockResolvedValue({});

      const { removeProject } = await import('./api');
      await removeProject('1');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/projects/1');
    });
  });

  describe('Repositories API', () => {
    it('getRepositories should fetch all repositories', async () => {
      const mockRepos: Repository[] = [
        { id: '1', projectId: '1', path: '/path/1', name: 'Repo 1' },
        { id: '2', projectId: '1', path: '/path/2', name: 'Repo 2' },
      ];

      mockAxiosInstance.get.mockResolvedValue({ data: mockRepos });

      const { getRepositories } = await import('./api');
      const result = await getRepositories();

      expect(result).toEqual(mockRepos);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/repositories', { params: {} });
    });

    it('getRepositories should filter by projectId when provided', async () => {
      const mockRepos: Repository[] = [
        { id: '1', projectId: '1', path: '/path/1', name: 'Repo 1' },
      ];

      mockAxiosInstance.get.mockResolvedValue({ data: mockRepos });

      const { getRepositories } = await import('./api');
      const result = await getRepositories('1');

      expect(result).toEqual(mockRepos);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/repositories', {
        params: { projectId: '1' },
      });
    });

    it('getRepository should fetch a single repository by id', async () => {
      const mockRepo: Repository = { id: '1', projectId: '1', path: '/path/1', name: 'Repo 1' };

      mockAxiosInstance.get.mockResolvedValue({ data: mockRepo });

      const { getRepository } = await import('./api');
      const result = await getRepository('1');

      expect(result).toEqual(mockRepo);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/repositories/1');
    });

    it('addRepository should create a new repository', async () => {
      const newRepo: Repository = { id: '1', projectId: '1', path: '/path/1', name: 'New Repo' };

      mockAxiosInstance.post.mockResolvedValue({ data: newRepo });

      const { addRepository } = await import('./api');
      const result = await addRepository('1', '/path/1', 'New Repo');

      expect(result).toEqual(newRepo);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/repositories', {
        projectId: '1',
        path: '/path/1',
        name: 'New Repo',
        replace: undefined,
      });
    });

    it('removeRepository should delete a repository', async () => {
      mockAxiosInstance.delete.mockResolvedValue({});

      const { removeRepository } = await import('./api');
      await removeRepository('1');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/repositories/1');
    });
  });

  describe('Stats API', () => {
    it('getStats should fetch repository statistics', async () => {
      const mockStats: GitStats = {
        summary: {
          totalCommits: 100,
          totalAuthors: 5,
          totalFiles: 50,
        },
        authors: [],
        activity: {
          hourOfDay: {},
          dayOfWeek: {},
          monthOfYear: {},
          year: {},
        },
        extensions: {},
        locHistory: [],
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockStats });

      const { getStats } = await import('./api');
      const repoId = 'test-repo-id-123';
      const result = await getStats(repoId);

      expect(result).toEqual(mockStats);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/stats', {
        params: { repoId: repoId },
      });
    });
  });
});
