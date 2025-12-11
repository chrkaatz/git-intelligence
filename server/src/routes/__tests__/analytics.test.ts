import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import analyticsRouter from '../analytics';
import * as repositoriesDb from '../../db/repositories';
import * as projectsDb from '../../db/projects';
import * as gitStats from '../../git/stats';
import * as gitDeveloperAnalytics from '../../git/developerAnalytics';
import * as gitCodebaseHealth from '../../git/codebaseHealth';
import * as gitRepositoryEvolution from '../../git/repositoryEvolution';
import * as gitBusFactor from '../../git/busFactor';
import * as gitSocialNetwork from '../../git/socialNetwork';
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

// Mock all git analysis functions
vi.mock('../../git/stats', () => ({
  getStats: vi.fn(),
}));

vi.mock('../../git/developerAnalytics', () => ({
  getDeveloperAnalytics: vi.fn(),
  getCrossRepoDeveloperAnalytics: vi.fn(),
}));

vi.mock('../../git/codebaseHealth', () => ({
  getCodebaseHealth: vi.fn(),
  getCrossRepoCodebaseHealth: vi.fn(),
}));

vi.mock('../../git/repositoryEvolution', () => ({
  getRepositoryEvolution: vi.fn(),
  getCrossRepoRepositoryEvolution: vi.fn(),
}));

vi.mock('../../git/busFactor', () => ({
  getBusFactorAndOwnership: vi.fn(),
  getCrossRepoBusFactorAndOwnership: vi.fn(),
}));

vi.mock('../../git/socialNetwork', () => ({
  getSocialNetworkAnalysis: vi.fn(),
  getCrossRepoSocialNetworkAnalysis: vi.fn(),
}));

const mockGetDb = vi.mocked(getDb);
const mockGetStats = vi.mocked(gitStats.getStats);
const mockGetDeveloperAnalytics = vi.mocked(gitDeveloperAnalytics.getDeveloperAnalytics);
const mockGetCrossRepoDeveloperAnalytics = vi.mocked(
  gitDeveloperAnalytics.getCrossRepoDeveloperAnalytics
);
const mockGetCodebaseHealth = vi.mocked(gitCodebaseHealth.getCodebaseHealth);
const mockGetCrossRepoCodebaseHealth = vi.mocked(gitCodebaseHealth.getCrossRepoCodebaseHealth);
const mockGetRepositoryEvolution = vi.mocked(gitRepositoryEvolution.getRepositoryEvolution);
const mockGetCrossRepoRepositoryEvolution = vi.mocked(
  gitRepositoryEvolution.getCrossRepoRepositoryEvolution
);
const mockGetBusFactorAndOwnership = vi.mocked(gitBusFactor.getBusFactorAndOwnership);
const mockGetCrossRepoBusFactorAndOwnership = vi.mocked(
  gitBusFactor.getCrossRepoBusFactorAndOwnership
);
const mockGetSocialNetworkAnalysis = vi.mocked(gitSocialNetwork.getSocialNetworkAnalysis);
const mockGetCrossRepoSocialNetworkAnalysis = vi.mocked(
  gitSocialNetwork.getCrossRepoSocialNetworkAnalysis
);

const app = express();
app.use(express.json());
app.use('/', analyticsRouter);

describe('Analytics Routes', () => {
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

  describe('GET /stats', () => {
    it('should return stats for a repository', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      const mockStats = {
        totalCommits: 100,
        totalAuthors: 5,
        totalFiles: 50,
        activity: {
          byHour: [],
          byDay: [],
          byMonth: [],
          byYear: [],
        },
        extensions: {},
        locHistory: [],
      };

      mockGetStats.mockResolvedValue(mockStats as any);

      const response = await request(app).get(`/stats?repoId=${repo.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStats);
      expect(mockGetStats).toHaveBeenCalledWith('/path/to/repo', true);
    });

    it('should bypass cache when refresh=true', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      const mockStats = {
        totalCommits: 100,
        totalAuthors: 5,
        totalFiles: 50,
        activity: {
          byHour: [],
          byDay: [],
          byMonth: [],
          byYear: [],
        },
        extensions: {},
        locHistory: [],
      };

      mockGetStats.mockResolvedValue(mockStats as any);

      const response = await request(app).get(`/stats?repoId=${repo.id}&refresh=true`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStats);
      expect(mockGetStats).toHaveBeenCalledWith('/path/to/repo', false);
    });

    it('should return 400 when repoId is missing', async () => {
      const response = await request(app).get('/stats');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Repository ID is required' });
    });

    it('should return 404 when repository not found', async () => {
      const response = await request(app).get('/stats?repoId=non-existent');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Repository not found' });
    });

    it('should handle errors from git stats', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      mockGetStats.mockRejectedValue(new Error('Git error'));

      const response = await request(app).get(`/stats?repoId=${repo.id}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to analyze project' });
    });
  });

  describe('GET /developer-analytics', () => {
    it('should return developer analytics for a repository', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      const mockAnalytics = {
        authors: [],
        longitudinalPatterns: {
          authorActivity: [],
          onboardingCurve: [],
          dormancy: [],
        },
      };

      mockGetDeveloperAnalytics.mockResolvedValue(mockAnalytics as any);

      const response = await request(app).get(`/developer-analytics?repoId=${repo.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockAnalytics);
      expect(mockGetDeveloperAnalytics).toHaveBeenCalledWith('/path/to/repo', true, undefined);
    });

    it('should bypass cache when refresh=true', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      const mockAnalytics = {
        authors: [],
        longitudinalPatterns: {
          authorActivity: [],
          onboardingCurve: [],
          dormancy: [],
        },
      };

      mockGetDeveloperAnalytics.mockResolvedValue(mockAnalytics as any);

      const response = await request(app).get(
        `/developer-analytics?repoId=${repo.id}&refresh=true`
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockAnalytics);
      expect(mockGetDeveloperAnalytics).toHaveBeenCalledWith('/path/to/repo', false, undefined);
    });

    it('should return 400 when repoId is missing', async () => {
      const response = await request(app).get('/developer-analytics');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Repository ID is required' });
    });

    it('should return 404 when repository not found', async () => {
      const response = await request(app).get('/developer-analytics?repoId=non-existent');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Repository not found' });
    });

    it('should handle errors from git analytics', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      mockGetDeveloperAnalytics.mockRejectedValue(new Error('Git error'));

      const response = await request(app).get(`/developer-analytics?repoId=${repo.id}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to get developer analytics' });
    });

    it('should include AI insights when ai=true', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      const mockAnalytics = {
        authors: [],
        longitudinalPatterns: {
          authorActivity: [],
          onboardingCurve: [],
          dormancy: [],
        },
        aiInsights: 'AI-generated insights for developer analytics',
      };

      mockGetDeveloperAnalytics.mockResolvedValue(mockAnalytics as any);

      const response = await request(app).get(`/developer-analytics?repoId=${repo.id}&ai=true`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockAnalytics);
      expect(response.body.aiInsights).toBe('AI-generated insights for developer analytics');
      expect(mockGetDeveloperAnalytics).toHaveBeenCalledWith('/path/to/repo', true, true);
    });

    it('should not include AI insights when ai parameter is not provided', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      const mockAnalytics = {
        authors: [],
        longitudinalPatterns: {
          authorActivity: [],
          onboardingCurve: [],
          dormancy: [],
        },
      };

      mockGetDeveloperAnalytics.mockResolvedValue(mockAnalytics as any);

      const response = await request(app).get(`/developer-analytics?repoId=${repo.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockAnalytics);
      expect(mockGetDeveloperAnalytics).toHaveBeenCalledWith('/path/to/repo', true, undefined);
    });
  });

  describe('GET /cross-repo-developer-analytics', () => {
    it('should return cross-repo developer analytics', async () => {
      const project = await projectsDb.addProject('Test Project');

      const mockAnalytics = {
        authors: [],
        longitudinalPatterns: {
          authorActivity: [],
          onboardingCurve: [],
          dormancy: [],
        },
      };

      mockGetCrossRepoDeveloperAnalytics.mockResolvedValue(mockAnalytics as any);

      const response = await request(app).get(
        `/cross-repo-developer-analytics?projectId=${project.id}`
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockAnalytics);
      expect(mockGetCrossRepoDeveloperAnalytics).toHaveBeenCalledWith(project.id, true);
    });

    it('should bypass cache when refresh=true', async () => {
      const project = await projectsDb.addProject('Test Project');

      const mockAnalytics = {
        authors: [],
        longitudinalPatterns: {
          authorActivity: [],
          onboardingCurve: [],
          dormancy: [],
        },
      };

      mockGetCrossRepoDeveloperAnalytics.mockResolvedValue(mockAnalytics as any);

      const response = await request(app).get(
        `/cross-repo-developer-analytics?projectId=${project.id}&refresh=true`
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockAnalytics);
      expect(mockGetCrossRepoDeveloperAnalytics).toHaveBeenCalledWith(project.id, false);
    });

    it('should return 400 when projectId is missing', async () => {
      const response = await request(app).get('/cross-repo-developer-analytics');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Project ID is required' });
    });

    it('should handle errors from git analytics', async () => {
      const project = await projectsDb.addProject('Test Project');

      mockGetCrossRepoDeveloperAnalytics.mockRejectedValue(new Error('Git error'));

      const response = await request(app).get(
        `/cross-repo-developer-analytics?projectId=${project.id}`
      );

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to get cross-repo developer analytics' });
    });
  });

  describe('GET /codebase-health', () => {
    it('should return codebase health for a repository', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      const mockHealth = {
        hotspots: [],
        changeCoupling: [],
        stability: [],
        complexity: [],
      };

      mockGetCodebaseHealth.mockResolvedValue(mockHealth as any);

      const response = await request(app).get(`/codebase-health?repoId=${repo.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockHealth);
      expect(mockGetCodebaseHealth).toHaveBeenCalledWith('/path/to/repo', true, undefined);
    });

    it('should bypass cache when refresh=true', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      const mockHealth = {
        hotspots: [],
        changeCoupling: [],
        stability: [],
        complexity: [],
      };

      mockGetCodebaseHealth.mockResolvedValue(mockHealth as any);

      const response = await request(app).get(`/codebase-health?repoId=${repo.id}&refresh=true`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockHealth);
      expect(mockGetCodebaseHealth).toHaveBeenCalledWith('/path/to/repo', false, undefined);
    });

    it('should return 400 when repoId is missing', async () => {
      const response = await request(app).get('/codebase-health');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Repository ID is required' });
    });

    it('should return 404 when repository not found', async () => {
      const response = await request(app).get('/codebase-health?repoId=non-existent');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Repository not found' });
    });

    it('should handle errors from git health', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      mockGetCodebaseHealth.mockRejectedValue(new Error('Git error'));

      const response = await request(app).get(`/codebase-health?repoId=${repo.id}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to get codebase health metrics' });
    });

    it('should include AI insights when ai=true', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      const mockHealth = {
        hotspots: [],
        changeCoupling: [],
        stability: [],
        complexity: [],
        aiInsights: 'AI-generated insights for codebase health',
      };

      mockGetCodebaseHealth.mockResolvedValue(mockHealth as any);

      const response = await request(app).get(`/codebase-health?repoId=${repo.id}&ai=true`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockHealth);
      expect(response.body.aiInsights).toBe('AI-generated insights for codebase health');
      expect(mockGetCodebaseHealth).toHaveBeenCalledWith('/path/to/repo', true, true);
    });
  });

  describe('GET /cross-repo-codebase-health', () => {
    it('should return cross-repo codebase health', async () => {
      const project = await projectsDb.addProject('Test Project');

      const mockHealth = {
        hotspots: [],
        changeCoupling: [],
        stability: [],
        complexity: [],
      };

      mockGetCrossRepoCodebaseHealth.mockResolvedValue(mockHealth as any);

      const response = await request(app).get(
        `/cross-repo-codebase-health?projectId=${project.id}`
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockHealth);
      expect(mockGetCrossRepoCodebaseHealth).toHaveBeenCalledWith(project.id, true);
    });

    it('should bypass cache when refresh=true', async () => {
      const project = await projectsDb.addProject('Test Project');

      const mockHealth = {
        hotspots: [],
        changeCoupling: [],
        stability: [],
        complexity: [],
      };

      mockGetCrossRepoCodebaseHealth.mockResolvedValue(mockHealth as any);

      const response = await request(app).get(
        `/cross-repo-codebase-health?projectId=${project.id}&refresh=true`
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockHealth);
      expect(mockGetCrossRepoCodebaseHealth).toHaveBeenCalledWith(project.id, false);
    });

    it('should return 400 when projectId is missing', async () => {
      const response = await request(app).get('/cross-repo-codebase-health');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Project ID is required' });
    });

    it('should handle errors from git health', async () => {
      const project = await projectsDb.addProject('Test Project');

      mockGetCrossRepoCodebaseHealth.mockRejectedValue(new Error('Git error'));

      const response = await request(app).get(
        `/cross-repo-codebase-health?projectId=${project.id}`
      );

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to get cross-repo codebase health metrics',
      });
    });
  });

  describe('GET /repository-evolution', () => {
    it('should return repository evolution for a repository', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      const mockEvolution = {
        commitFrequency: [],
        releases: [],
        growthCurve: [],
        changeBursts: [],
        churn: [],
      };

      mockGetRepositoryEvolution.mockResolvedValue(mockEvolution as any);

      const response = await request(app).get(`/repository-evolution?repoId=${repo.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockEvolution);
      expect(mockGetRepositoryEvolution).toHaveBeenCalledWith('/path/to/repo', true, undefined);
    });

    it('should bypass cache when refresh=true', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      const mockEvolution = {
        commitFrequency: [],
        releases: [],
        growthCurve: [],
        changeBursts: [],
        churn: [],
      };

      mockGetRepositoryEvolution.mockResolvedValue(mockEvolution as any);

      const response = await request(app).get(
        `/repository-evolution?repoId=${repo.id}&refresh=true`
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockEvolution);
      expect(mockGetRepositoryEvolution).toHaveBeenCalledWith('/path/to/repo', false, undefined);
    });

    it('should return 400 when repoId is missing', async () => {
      const response = await request(app).get('/repository-evolution');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Repository ID is required' });
    });

    it('should return 404 when repository not found', async () => {
      const response = await request(app).get('/repository-evolution?repoId=non-existent');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Repository not found' });
    });

    it('should handle errors from git evolution', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      mockGetRepositoryEvolution.mockRejectedValue(new Error('Git error'));

      const response = await request(app).get(`/repository-evolution?repoId=${repo.id}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to get repository evolution metrics',
      });
    });

    it('should include AI insights when ai=true', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      const mockEvolution = {
        commitFrequency: [],
        releases: [],
        growthCurve: [],
        changeBursts: [],
        churn: [],
        aiInsights: 'AI-generated insights for repository evolution',
      };

      mockGetRepositoryEvolution.mockResolvedValue(mockEvolution as any);

      const response = await request(app).get(`/repository-evolution?repoId=${repo.id}&ai=true`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockEvolution);
      expect(response.body.aiInsights).toBe('AI-generated insights for repository evolution');
      expect(mockGetRepositoryEvolution).toHaveBeenCalledWith('/path/to/repo', true, true);
    });
  });

  describe('GET /cross-repo-repository-evolution', () => {
    it('should return cross-repo repository evolution', async () => {
      const project = await projectsDb.addProject('Test Project');

      const mockEvolution = {
        commitFrequency: [],
        releases: [],
        growthCurve: [],
        changeBursts: [],
        churn: [],
      };

      mockGetCrossRepoRepositoryEvolution.mockResolvedValue(mockEvolution as any);

      const response = await request(app).get(
        `/cross-repo-repository-evolution?projectId=${project.id}`
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockEvolution);
      expect(mockGetCrossRepoRepositoryEvolution).toHaveBeenCalledWith(project.id, true);
    });

    it('should bypass cache when refresh=true', async () => {
      const project = await projectsDb.addProject('Test Project');

      const mockEvolution = {
        commitFrequency: [],
        releases: [],
        growthCurve: [],
        changeBursts: [],
        churn: [],
      };

      mockGetCrossRepoRepositoryEvolution.mockResolvedValue(mockEvolution as any);

      const response = await request(app).get(
        `/cross-repo-repository-evolution?projectId=${project.id}&refresh=true`
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockEvolution);
      expect(mockGetCrossRepoRepositoryEvolution).toHaveBeenCalledWith(project.id, false);
    });

    it('should return 400 when projectId is missing', async () => {
      const response = await request(app).get('/cross-repo-repository-evolution');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Project ID is required' });
    });

    it('should handle errors from git evolution', async () => {
      const project = await projectsDb.addProject('Test Project');

      mockGetCrossRepoRepositoryEvolution.mockRejectedValue(new Error('Git error'));

      const response = await request(app).get(
        `/cross-repo-repository-evolution?projectId=${project.id}`
      );

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to get cross-repo repository evolution metrics',
      });
    });
  });

  describe('GET /bus-factor-and-ownership', () => {
    it('should return bus factor and ownership for a repository', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      const mockBusFactor = {
        singleMaintainerRisk: [],
        fragmentation: [],
        ownerChurn: [],
      };

      mockGetBusFactorAndOwnership.mockResolvedValue(mockBusFactor as any);

      const response = await request(app).get(`/bus-factor-and-ownership?repoId=${repo.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockBusFactor);
      expect(mockGetBusFactorAndOwnership).toHaveBeenCalledWith('/path/to/repo', true, undefined);
    });

    it('should bypass cache when refresh=true', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      const mockBusFactor = {
        singleMaintainerRisk: [],
        fragmentation: [],
        ownerChurn: [],
      };

      mockGetBusFactorAndOwnership.mockResolvedValue(mockBusFactor as any);

      const response = await request(app).get(
        `/bus-factor-and-ownership?repoId=${repo.id}&refresh=true`
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockBusFactor);
      expect(mockGetBusFactorAndOwnership).toHaveBeenCalledWith('/path/to/repo', false, undefined);
    });

    it('should return 400 when repoId is missing', async () => {
      const response = await request(app).get('/bus-factor-and-ownership');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Repository ID is required' });
    });

    it('should return 404 when repository not found', async () => {
      const response = await request(app).get('/bus-factor-and-ownership?repoId=non-existent');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Repository not found' });
    });

    it('should handle errors from git bus factor', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      mockGetBusFactorAndOwnership.mockRejectedValue(new Error('Git error'));

      const response = await request(app).get(`/bus-factor-and-ownership?repoId=${repo.id}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to get bus factor and ownership metrics',
      });
    });

    it('should include AI insights when ai=true', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      const mockBusFactor = {
        singleMaintainerRisk: [],
        fragmentation: [],
        ownerChurn: [],
        aiInsights: 'AI-generated insights for bus factor',
      };

      mockGetBusFactorAndOwnership.mockResolvedValue(mockBusFactor as any);

      const response = await request(app).get(
        `/bus-factor-and-ownership?repoId=${repo.id}&ai=true`
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockBusFactor);
      expect(response.body.aiInsights).toBe('AI-generated insights for bus factor');
      expect(mockGetBusFactorAndOwnership).toHaveBeenCalledWith('/path/to/repo', true, true);
    });
  });

  describe('GET /cross-repo-bus-factor-and-ownership', () => {
    it('should return cross-repo bus factor and ownership', async () => {
      const project = await projectsDb.addProject('Test Project');

      const mockBusFactor = {
        singleMaintainerRisk: [],
        fragmentation: [],
        ownerChurn: [],
      };

      mockGetCrossRepoBusFactorAndOwnership.mockResolvedValue(mockBusFactor as any);

      const response = await request(app).get(
        `/cross-repo-bus-factor-and-ownership?projectId=${project.id}`
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockBusFactor);
      expect(mockGetCrossRepoBusFactorAndOwnership).toHaveBeenCalledWith(project.id, true);
    });

    it('should bypass cache when refresh=true', async () => {
      const project = await projectsDb.addProject('Test Project');

      const mockBusFactor = {
        singleMaintainerRisk: [],
        fragmentation: [],
        ownerChurn: [],
      };

      mockGetCrossRepoBusFactorAndOwnership.mockResolvedValue(mockBusFactor as any);

      const response = await request(app).get(
        `/cross-repo-bus-factor-and-ownership?projectId=${project.id}&refresh=true`
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockBusFactor);
      expect(mockGetCrossRepoBusFactorAndOwnership).toHaveBeenCalledWith(project.id, false);
    });

    it('should return 400 when projectId is missing', async () => {
      const response = await request(app).get('/cross-repo-bus-factor-and-ownership');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Project ID is required' });
    });

    it('should handle errors from git bus factor', async () => {
      const project = await projectsDb.addProject('Test Project');

      mockGetCrossRepoBusFactorAndOwnership.mockRejectedValue(new Error('Git error'));

      const response = await request(app).get(
        `/cross-repo-bus-factor-and-ownership?projectId=${project.id}`
      );

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to get cross-repo bus factor and ownership metrics',
      });
    });
  });

  describe('GET /social-network-analysis', () => {
    it('should return social network analysis for a repository', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      const mockSNA = {
        collaborationGraph: {
          nodes: [],
          edges: [],
        },
        knowledgeSilos: [],
        orphanedCode: [],
      };

      mockGetSocialNetworkAnalysis.mockResolvedValue(mockSNA as any);

      const response = await request(app).get(`/social-network-analysis?repoId=${repo.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSNA);
      expect(mockGetSocialNetworkAnalysis).toHaveBeenCalledWith('/path/to/repo', true, undefined);
    });

    it('should bypass cache when refresh=true', async () => {
      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      const mockSNA = {
        collaborationGraph: {
          nodes: [],
          edges: [],
        },
        knowledgeSilos: [],
        orphanedCode: [],
      };

      mockGetSocialNetworkAnalysis.mockResolvedValue(mockSNA as any);

      const response = await request(app).get(
        `/social-network-analysis?repoId=${repo.id}&refresh=true`
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSNA);
      expect(mockGetSocialNetworkAnalysis).toHaveBeenCalledWith('/path/to/repo', false, undefined);
    });

    it('should return 400 when repoId is missing', async () => {
      const response = await request(app).get('/social-network-analysis');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Repository ID is required' });
    });

    it('should return 404 when repository not found', async () => {
      // Suppress console.error for expected error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app).get('/social-network-analysis?repoId=non-existent');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Repository not found' });

      consoleErrorSpy.mockRestore();
    });

    it('should handle errors from git social network', async () => {
      // Suppress console.error for expected error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const project = await projectsDb.addProject('Test Project');
      const repo = await repositoriesDb.addRepository(project.id, '/path/to/repo', 'Test Repo');

      mockGetSocialNetworkAnalysis.mockRejectedValue(new Error('Git error'));

      const response = await request(app).get(`/social-network-analysis?repoId=${repo.id}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to get social network analysis' });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('GET /cross-repo-social-network-analysis', () => {
    it('should return cross-repo social network analysis', async () => {
      const project = await projectsDb.addProject('Test Project');

      const mockSNA = {
        collaborationGraph: {
          nodes: [],
          edges: [],
        },
        knowledgeSilos: [],
        orphanedCode: [],
      };

      mockGetCrossRepoSocialNetworkAnalysis.mockResolvedValue(mockSNA as any);

      const response = await request(app).get(
        `/cross-repo-social-network-analysis?projectId=${project.id}`
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSNA);
      expect(mockGetCrossRepoSocialNetworkAnalysis).toHaveBeenCalledWith(project.id, true);
    });

    it('should bypass cache when refresh=true', async () => {
      const project = await projectsDb.addProject('Test Project');

      const mockSNA = {
        collaborationGraph: {
          nodes: [],
          edges: [],
        },
        knowledgeSilos: [],
        orphanedCode: [],
      };

      mockGetCrossRepoSocialNetworkAnalysis.mockResolvedValue(mockSNA as any);

      const response = await request(app).get(
        `/cross-repo-social-network-analysis?projectId=${project.id}&refresh=true`
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSNA);
      expect(mockGetCrossRepoSocialNetworkAnalysis).toHaveBeenCalledWith(project.id, false);
    });

    it('should return 400 when projectId is missing', async () => {
      const response = await request(app).get('/cross-repo-social-network-analysis');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Project ID is required' });
    });

    it('should handle errors from git social network', async () => {
      // Suppress console.error for expected error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const project = await projectsDb.addProject('Test Project');

      mockGetCrossRepoSocialNetworkAnalysis.mockRejectedValue(new Error('Git error'));

      const response = await request(app).get(
        `/cross-repo-social-network-analysis?projectId=${project.id}`
      );

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to get cross-repo social network analysis',
      });

      consoleErrorSpy.mockRestore();
    });
  });
});
