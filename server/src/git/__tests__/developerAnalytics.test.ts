import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDeveloperAnalytics, getCrossRepoDeveloperAnalytics } from '../developerAnalytics';
import simpleGit from 'simple-git';
import { getRepositories, getOllamaSettings, getCachedDeveloperAnalytics } from '../../db';
import { generateInsights } from '../../services/aiAnalysis';

// Mock dependencies
vi.mock('simple-git');
vi.mock('../../db');
vi.mock('../../services/aiAnalysis');

const mockSimpleGit = vi.mocked(simpleGit);
const mockGetRepositories = vi.mocked(getRepositories);
const mockGetOllamaSettings = vi.mocked(getOllamaSettings);
const mockGenerateInsights = vi.mocked(generateInsights);
const mockGetCachedDeveloperAnalytics = vi.mocked(getCachedDeveloperAnalytics);

describe('developerAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDeveloperAnalytics', () => {
    it('should throw error for non-git repository', async () => {
      // Suppress console.error for expected error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(false),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      await expect(getDeveloperAnalytics('/test/repo', false)).rejects.toThrow(
        'Not a git repository'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should process commits and calculate analytics', async () => {
      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        log: vi.fn().mockResolvedValue({
          total: 2,
          all: [],
        }),
        raw: vi
          .fn()
          .mockResolvedValue(
            `${hash1}|John Doe|john@example.com|2024-01-01T10:00:00Z|G|Initial commit\n` +
              '10\t5\tfile1.ts\n' +
              `${hash2}|John Doe|john@example.com|2024-01-02T11:00:00Z|N|Fix bug\n` +
              '3\t1\tfile2.ts\n'
          ),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await getDeveloperAnalytics('/test/repo', false);

      expect(result).toBeDefined();
      expect(result.authors).toBeDefined();
      expect(result.authors.length).toBeGreaterThan(0);
      expect(result.longitudinalPatterns).toBeDefined();
    });

    it('should detect fix commits', async () => {
      const hash = 'a'.repeat(40);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        log: vi.fn().mockResolvedValue({
          total: 1,
          all: [],
        }),
        raw: vi
          .fn()
          .mockResolvedValue(
            `${hash}|John Doe|john@example.com|2024-01-01T10:00:00Z|G|fix: bug in file\n` +
              '10\t5\tfile1.ts\n'
          ),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await getDeveloperAnalytics('/test/repo', false);

      expect(result.authors.length).toBeGreaterThan(0);
      expect(result.authors[0].fixCommits).toBeGreaterThan(0);
    });

    it('should detect revert commits', async () => {
      const hash = 'a'.repeat(40);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        log: vi.fn().mockResolvedValue({
          total: 1,
          all: [],
        }),
        raw: vi
          .fn()
          .mockResolvedValue(
            `${hash}|John Doe|john@example.com|2024-01-01T10:00:00Z|G|revert: previous change\n` +
              '10\t5\tfile1.ts\n'
          ),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await getDeveloperAnalytics('/test/repo', false);

      expect(result.authors.length).toBeGreaterThan(0);
      expect(result.authors[0].revertCommits).toBeGreaterThan(0);
    });

    it('should generate AI insights when includeAIInsights is true and Ollama is enabled', async () => {
      const hash = 'a'.repeat(40);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        log: vi.fn().mockResolvedValue({
          total: 1,
          all: [],
        }),
        raw: vi
          .fn()
          .mockResolvedValue(
            `${hash}|John Doe|john@example.com|2024-01-01T10:00:00Z|G|Initial commit\n` +
              '10\t5\tfile1.ts\n'
          ),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);
      mockGetOllamaSettings.mockResolvedValue({
        enabled: true,
        host: 'localhost',
        port: 11434,
        model: 'llama3',
        timeout: 30000,
      });
      mockGenerateInsights.mockResolvedValue('AI-generated insights for developer analytics');

      const result = await getDeveloperAnalytics('/test/repo', false, true);

      expect(result.aiInsights).toBe('AI-generated insights for developer analytics');
      expect(mockGetOllamaSettings).toHaveBeenCalled();
      expect(mockGenerateInsights).toHaveBeenCalledWith(
        'developer-analytics',
        expect.objectContaining({
          authors: expect.any(Array),
        }),
        expect.objectContaining({
          enabled: true,
        })
      );
    });

    it('should not generate AI insights when Ollama is disabled', async () => {
      const hash = 'a'.repeat(40);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        log: vi.fn().mockResolvedValue({
          total: 1,
          all: [],
        }),
        raw: vi
          .fn()
          .mockResolvedValue(
            `${hash}|John Doe|john@example.com|2024-01-01T10:00:00Z|G|Initial commit\n` +
              '10\t5\tfile1.ts\n'
          ),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);
      mockGetOllamaSettings.mockResolvedValue({
        enabled: false,
        host: 'localhost',
        port: 11434,
        model: 'llama3',
        timeout: 30000,
      });

      const result = await getDeveloperAnalytics('/test/repo', false, true);

      expect(result.aiInsights).toBeUndefined();
      expect(mockGetOllamaSettings).toHaveBeenCalled();
      expect(mockGenerateInsights).not.toHaveBeenCalled();
    });

    it('should not generate AI insights when includeAIInsights is false', async () => {
      const hash = 'a'.repeat(40);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        log: vi.fn().mockResolvedValue({
          total: 1,
          all: [],
        }),
        raw: vi
          .fn()
          .mockResolvedValue(
            `${hash}|John Doe|john@example.com|2024-01-01T10:00:00Z|G|Initial commit\n` +
              '10\t5\tfile1.ts\n'
          ),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await getDeveloperAnalytics('/test/repo', false, false);

      expect(result.aiInsights).toBeUndefined();
      expect(mockGetOllamaSettings).not.toHaveBeenCalled();
      expect(mockGenerateInsights).not.toHaveBeenCalled();
    });

    it('should handle AI insights generation errors gracefully', async () => {
      const hash = 'a'.repeat(40);
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        log: vi.fn().mockResolvedValue({
          total: 1,
          all: [],
        }),
        raw: vi
          .fn()
          .mockResolvedValue(
            `${hash}|John Doe|john@example.com|2024-01-01T10:00:00Z|G|Initial commit\n` +
              '10\t5\tfile1.ts\n'
          ),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);
      mockGetOllamaSettings.mockResolvedValue({
        enabled: true,
        host: 'localhost',
        port: 11434,
        model: 'llama3',
        timeout: 30000,
      });
      mockGenerateInsights.mockRejectedValue(new Error('Ollama connection failed'));

      const result = await getDeveloperAnalytics('/test/repo', false, true);

      expect(result.aiInsights).toBeUndefined();
      expect(result.authors).toBeDefined();
      expect(result.authors.length).toBeGreaterThan(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to generate AI insights'),
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it('should generate AI insights for cached data when includeAIInsights is true', async () => {
      const cachedAnalytics = {
        authors: [
          {
            name: 'John Doe',
            email: 'john@example.com',
            commits: 100,
            linesAdded: 5000,
            linesRemoved: 2000,
            netLines: 3000,
            firstCommit: '2024-01-01',
            lastCommit: '2024-12-01',
            percentage: '50%',
            activeTimeWindows: {
              hourOfDay: { 9: 20 },
              dayOfWeek: { 1: 30 },
            },
            signedCommits: 80,
            signedCommitsPercentage: '80%',
            fixCommits: 10,
            fixCommitRatio: '10%',
            revertCommits: 2,
            revertCommitRatio: '2%',
            churn: 2000,
            churnRatio: '40%',
          },
        ],
        longitudinalPatterns: undefined,
      };

      // Mock the cache to return data
      mockGetCachedDeveloperAnalytics.mockResolvedValue(cachedAnalytics as any);

      mockGetOllamaSettings.mockResolvedValue({
        enabled: true,
        host: 'localhost',
        port: 11434,
        model: 'llama3',
        timeout: 30000,
      });
      mockGenerateInsights.mockResolvedValue(
        'AI-generated insights for cached developer analytics'
      );

      const result = await getDeveloperAnalytics('/test/repo', true, true);

      expect(result.aiInsights).toBe('AI-generated insights for cached developer analytics');
      expect(result.authors).toEqual(cachedAnalytics.authors);
      expect(mockGetOllamaSettings).toHaveBeenCalled();
      expect(mockGenerateInsights).toHaveBeenCalledWith(
        'developer-analytics',
        cachedAnalytics,
        expect.objectContaining({
          enabled: true,
        })
      );
      // Should not have called git operations since we used cached data
      expect(mockSimpleGit).not.toHaveBeenCalled();
    });
  });

  describe('getCrossRepoDeveloperAnalytics', () => {
    it('should return empty result when no repositories', async () => {
      mockGetRepositories.mockResolvedValue([]);

      const result = await getCrossRepoDeveloperAnalytics('project-1', false);

      expect(result.authors).toEqual([]);
      expect(result.totalRepos).toBe(0);
      expect(result.repoNames).toEqual([]);
    });

    it('should aggregate analytics across repositories', async () => {
      // Mock repositories
      mockGetRepositories.mockResolvedValue([
        { id: 'repo1', name: 'Repo 1', path: '/repo1', projectId: 'project-1' },
        { id: 'repo2', name: 'Repo 2', path: '/repo2', projectId: 'project-1' },
      ]);

      // Mock git for each repo - need to return different instances
      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);

      let callCount = 0;
      const mockGitFactory = () => {
        callCount++;
        const hash = callCount === 1 ? hash1 : hash2;
        return {
          checkIsRepo: vi.fn().mockResolvedValue(true),
          log: vi.fn().mockResolvedValue({
            total: 1,
            all: [],
          }),
          raw: vi
            .fn()
            .mockResolvedValue(
              `${hash}|John Doe|john@example.com|2024-01-0${callCount}T10:00:00Z|G|Initial commit\n` +
                '10\t5\tfile1.ts\n'
            ),
        };
      };

      vi.mocked(simpleGit).mockImplementation(mockGitFactory as any);

      const result = await getCrossRepoDeveloperAnalytics('project-1', false);

      expect(result.totalRepos).toBe(2);
      expect(result.repoNames.length).toBe(2);
      expect(result.authors.length).toBeGreaterThan(0);
    });
  });
});
