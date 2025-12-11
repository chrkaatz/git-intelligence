import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getRepositoryEvolution, getCrossRepoRepositoryEvolution } from '../repositoryEvolution';
import simpleGit from 'simple-git';
import { getRepositories, getOllamaSettings } from '../../db';
import { generateInsights } from '../../services/aiAnalysis';

// Mock dependencies
vi.mock('simple-git');
vi.mock('../../db');
vi.mock('../../services/aiAnalysis');

const mockSimpleGit = vi.mocked(simpleGit);
const mockGetRepositories = vi.mocked(getRepositories);
const mockGetOllamaSettings = vi.mocked(getOllamaSettings);
const mockGenerateInsights = vi.mocked(generateInsights);

describe('repositoryEvolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRepositoryEvolution', () => {
    it('should throw error for non-git repository', async () => {
      // Suppress console.error for expected error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(false),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      await expect(getRepositoryEvolution('/test/repo', false)).rejects.toThrow(
        'Not a git repository'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should calculate evolution metrics', async () => {
      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);
      const hash3 = 'c'.repeat(40);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi
          .fn()
          .mockResolvedValueOnce(
            `${hash1}|2024-01-01T10:00:00Z|Initial commit\n` +
              '10\t5\tfile1.ts\n' +
              `${hash2}|2024-01-02T11:00:00Z|Add feature\n` +
              '20\t3\tfile2.ts\n'
          )
          .mockResolvedValueOnce(`${hash3}|2024-01-01T10:00:00Z|Release v1.0.0`),
        tags: vi.fn().mockResolvedValue({
          all: ['v1.0.0'],
        }),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await getRepositoryEvolution('/test/repo', false);

      expect(result).toBeDefined();
      expect(result.commitFrequency).toBeDefined();
      expect(result.growthCurve).toBeDefined();
      expect(result.churnMetrics).toBeDefined();
      expect(result.totalCommits).toBeGreaterThan(0);
    });

    it('should detect change bursts', async () => {
      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi.fn().mockResolvedValueOnce(
          // First commit with large change (burst) - needs to be processed by second commit
          `${hash1}|2024-01-01T10:00:00Z|Large refactor\n` +
            '500\t450\tfile1.ts\n' +
            // Second commit to trigger processing of first commit's burst
            `${hash2}|2024-01-02T10:00:00Z|Small fix\n` +
            '5\t2\tfile2.ts\n'
        ),
        tags: vi.fn().mockResolvedValue({
          all: [],
        }),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await getRepositoryEvolution('/test/repo', false);

      expect(result.changeBursts.length).toBeGreaterThan(0);
      const burst = result.changeBursts[0];
      expect(burst.linesAdded + burst.linesRemoved).toBeGreaterThan(100);
    });

    it('should generate AI insights when includeAIInsights is true and Ollama is enabled', async () => {
      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi
          .fn()
          .mockResolvedValueOnce(
            `${hash1}|2024-01-01T10:00:00Z|Initial commit\n` +
              '10\t5\tfile1.ts\n' +
              `${hash2}|2024-01-02T11:00:00Z|Add feature\n` +
              '20\t3\tfile2.ts\n'
          )
          .mockResolvedValueOnce(''),
        tags: vi.fn().mockResolvedValue({
          all: [],
        }),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);
      mockGetOllamaSettings.mockResolvedValue({
        enabled: true,
        host: 'localhost',
        port: 11434,
        model: 'llama3',
        timeout: 30000,
      });
      mockGenerateInsights.mockResolvedValue('AI-generated insights for repository evolution');

      const result = await getRepositoryEvolution('/test/repo', false, true);

      expect(result.aiInsights).toBe('AI-generated insights for repository evolution');
      expect(mockGetOllamaSettings).toHaveBeenCalled();
      expect(mockGenerateInsights).toHaveBeenCalledWith(
        'repository-evolution',
        expect.objectContaining({
          commitFrequency: expect.any(Array),
        }),
        expect.objectContaining({
          enabled: true,
        })
      );
    });

    it('should not generate AI insights when Ollama is disabled', async () => {
      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi
          .fn()
          .mockResolvedValueOnce(
            `${hash1}|2024-01-01T10:00:00Z|Initial commit\n` +
              '10\t5\tfile1.ts\n' +
              `${hash2}|2024-01-02T11:00:00Z|Add feature\n` +
              '20\t3\tfile2.ts\n'
          )
          .mockResolvedValueOnce(''),
        tags: vi.fn().mockResolvedValue({
          all: [],
        }),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);
      mockGetOllamaSettings.mockResolvedValue({
        enabled: false,
        host: 'localhost',
        port: 11434,
        model: 'llama3',
        timeout: 30000,
      });

      const result = await getRepositoryEvolution('/test/repo', false, true);

      expect(result.aiInsights).toBeUndefined();
      expect(mockGetOllamaSettings).toHaveBeenCalled();
      expect(mockGenerateInsights).not.toHaveBeenCalled();
    });

    it('should handle AI insights generation errors gracefully', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi
          .fn()
          .mockResolvedValueOnce(
            `${hash1}|2024-01-01T10:00:00Z|Initial commit\n` +
              '10\t5\tfile1.ts\n' +
              `${hash2}|2024-01-02T11:00:00Z|Add feature\n` +
              '20\t3\tfile2.ts\n'
          )
          .mockResolvedValueOnce(''),
        tags: vi.fn().mockResolvedValue({
          all: [],
        }),
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

      const result = await getRepositoryEvolution('/test/repo', false, true);

      expect(result.aiInsights).toBeUndefined();
      expect(result.commitFrequency).toBeDefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to generate AI insights'),
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('getCrossRepoRepositoryEvolution', () => {
    it('should return empty result when no repositories', async () => {
      mockGetRepositories.mockResolvedValue([]);

      const result = await getCrossRepoRepositoryEvolution('project-1', false);

      expect(result.repositories).toEqual([]);
      expect(result.totalRepos).toBe(0);
    });
  });
});
