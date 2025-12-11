import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCodebaseHealth, getCrossRepoCodebaseHealth } from '../codebaseHealth';
import simpleGit from 'simple-git';
import {
  getCachedCodebaseHealth,
  setCachedCodebaseHealth,
  getRepositories,
  getOllamaSettings,
} from '../../db';
import { generateInsights } from '../../services/aiAnalysis';

// Mock dependencies
vi.mock('simple-git');
vi.mock('../../db');
vi.mock('../../services/aiAnalysis');

const mockSimpleGit = vi.mocked(simpleGit);
const mockGetCachedCodebaseHealth = vi.mocked(getCachedCodebaseHealth);
const mockSetCachedCodebaseHealth = vi.mocked(setCachedCodebaseHealth);
const mockGetRepositories = vi.mocked(getRepositories);
const mockGetOllamaSettings = vi.mocked(getOllamaSettings);
const mockGenerateInsights = vi.mocked(generateInsights);

describe('codebaseHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCodebaseHealth', () => {
    it('should return cached health when available', async () => {
      const cachedHealth = {
        hotspots: { files: [], directories: [] },
        changeCoupling: { pairs: [] },
        stability: { files: [] },
        complexity: { averageDiffSizes: [], largestDiffs: [], mostRewritten: [] },
      };

      mockGetCachedCodebaseHealth.mockResolvedValue(cachedHealth);

      const result = await getCodebaseHealth('/test/repo', true);

      expect(result).toEqual(cachedHealth);
      expect(mockGetCachedCodebaseHealth).toHaveBeenCalledWith('/test/repo');
    });

    it('should calculate fresh health when cache is disabled', async () => {
      mockGetCachedCodebaseHealth.mockResolvedValue(null);

      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi
          .fn()
          .mockResolvedValue(
            `${hash1}|2024-01-01T10:00:00Z\n` +
              '10\t5\tfile1.ts\n' +
              `${hash2}|2024-01-02T11:00:00Z\n` +
              '3\t1\tfile2.ts\n'
          ),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await getCodebaseHealth('/test/repo', false);

      expect(result).toBeDefined();
      expect(result.hotspots).toBeDefined();
      expect(result.changeCoupling).toBeDefined();
      expect(result.stability).toBeDefined();
      expect(result.complexity).toBeDefined();
    });

    it('should throw error for non-git repository', async () => {
      // Suppress console.error for expected error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockGetCachedCodebaseHealth.mockResolvedValue(null);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(false),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      await expect(getCodebaseHealth('/test/repo', false)).rejects.toThrow('Not a git repository');

      consoleErrorSpy.mockRestore();
    });

    it('should identify file hotspots', async () => {
      mockGetCachedCodebaseHealth.mockResolvedValue(null);

      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);
      const hash3 = 'c'.repeat(40);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi
          .fn()
          .mockResolvedValue(
            `${hash1}|2024-01-01T10:00:00Z\n` +
              '10\t5\tfile1.ts\n' +
              `${hash2}|2024-01-02T11:00:00Z\n` +
              '3\t1\tfile1.ts\n' +
              `${hash3}|2024-01-03T12:00:00Z\n` +
              '2\t1\tfile1.ts\n'
          ),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await getCodebaseHealth('/test/repo', false);

      expect(result.hotspots.files.length).toBeGreaterThan(0);
      // file1.ts should have the most commits
      const topFile = result.hotspots.files[0];
      expect(topFile.file).toBe('file1.ts');
      expect(topFile.commits).toBe(3);
    });

    it('should generate AI insights when includeAIInsights is true and Ollama is enabled', async () => {
      mockGetCachedCodebaseHealth.mockResolvedValue(null);

      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi
          .fn()
          .mockResolvedValue(
            `${hash1}|2024-01-01T10:00:00Z\n` +
              '10\t5\tfile1.ts\n' +
              `${hash2}|2024-01-02T11:00:00Z\n` +
              '3\t1\tfile2.ts\n'
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
      mockGenerateInsights.mockResolvedValue('AI-generated insights for codebase health');

      const result = await getCodebaseHealth('/test/repo', false, true);

      expect(result.aiInsights).toBe('AI-generated insights for codebase health');
      expect(mockGetOllamaSettings).toHaveBeenCalled();
      expect(mockGenerateInsights).toHaveBeenCalledWith(
        'codebase-health',
        expect.objectContaining({
          hotspots: expect.any(Object),
        }),
        expect.objectContaining({
          enabled: true,
        })
      );
    });

    it('should not generate AI insights when Ollama is disabled', async () => {
      mockGetCachedCodebaseHealth.mockResolvedValue(null);

      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi
          .fn()
          .mockResolvedValue(
            `${hash1}|2024-01-01T10:00:00Z\n` +
              '10\t5\tfile1.ts\n' +
              `${hash2}|2024-01-02T11:00:00Z\n` +
              '3\t1\tfile2.ts\n'
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

      const result = await getCodebaseHealth('/test/repo', false, true);

      expect(result.aiInsights).toBeUndefined();
      expect(mockGetOllamaSettings).toHaveBeenCalled();
      expect(mockGenerateInsights).not.toHaveBeenCalled();
    });

    it('should handle AI insights generation errors gracefully', async () => {
      mockGetCachedCodebaseHealth.mockResolvedValue(null);
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi
          .fn()
          .mockResolvedValue(
            `${hash1}|2024-01-01T10:00:00Z\n` +
              '10\t5\tfile1.ts\n' +
              `${hash2}|2024-01-02T11:00:00Z\n` +
              '3\t1\tfile2.ts\n'
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

      const result = await getCodebaseHealth('/test/repo', false, true);

      expect(result.aiInsights).toBeUndefined();
      expect(result.hotspots).toBeDefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to generate AI insights'),
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it('should generate AI insights for cached data when includeAIInsights is true', async () => {
      const cachedHealth = {
        hotspots: { files: [], directories: [] },
        changeCoupling: { pairs: [] },
        stability: { files: [] },
        complexity: {
          averageDiffSizes: [],
          largestDiffs: [],
          mostRewritten: [],
        },
        hygiene: {
          branchCount: 0,
          unmergedBranchCount: 0,
          oldestUnmergedBranchDays: 0,
          unmergedBranches: [],
          dependencyAutomation: {
            hasDependabot: false,
            hasRenovate: false,
            configFiles: [],
          },
          cicdAutomation: {
            hasGitHubActions: false,
            hasGitLabCI: false,
            hasCircleCI: false,
            hasJenkins: false,
            configFiles: [],
          },
        },
      };

      mockGetCachedCodebaseHealth.mockResolvedValue(cachedHealth as any);

      mockGetOllamaSettings.mockResolvedValue({
        enabled: true,
        host: 'localhost',
        port: 11434,
        model: 'llama3',
        timeout: 30000,
      });
      mockGenerateInsights.mockResolvedValue('AI-generated insights for cached codebase health');

      const result = await getCodebaseHealth('/test/repo', true, true);

      expect(result.aiInsights).toBe('AI-generated insights for cached codebase health');
      expect(result.hotspots).toEqual(cachedHealth.hotspots);
      expect(mockGetOllamaSettings).toHaveBeenCalled();
      expect(mockGenerateInsights).toHaveBeenCalledWith(
        'codebase-health',
        cachedHealth,
        expect.objectContaining({
          enabled: true,
        })
      );
      // Should not have called git operations since we used cached data
      expect(mockSimpleGit).not.toHaveBeenCalled();
    });
  });

  describe('getCrossRepoCodebaseHealth', () => {
    it('should return empty result when no repositories', async () => {
      mockGetRepositories.mockResolvedValue([]);

      const result = await getCrossRepoCodebaseHealth('project-1', false);

      expect(result.hotspots.repositories).toEqual([]);
      expect(result.totalRepos).toBe(0);
    });
  });
});
