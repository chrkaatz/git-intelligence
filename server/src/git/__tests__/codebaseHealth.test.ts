import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCodebaseHealth, getCrossRepoCodebaseHealth } from '../codebaseHealth';
import simpleGit from 'simple-git';
import { getCachedCodebaseHealth, setCachedCodebaseHealth, getRepositories } from '../../db';

// Mock dependencies
vi.mock('simple-git');
vi.mock('../../db');

const mockSimpleGit = vi.mocked(simpleGit);
const mockGetCachedCodebaseHealth = vi.mocked(getCachedCodebaseHealth);
const mockSetCachedCodebaseHealth = vi.mocked(setCachedCodebaseHealth);
const mockGetRepositories = vi.mocked(getRepositories);

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
      expect(mockGetCachedCodebaseHealth).toHaveBeenCalledWith('/test/repo', 3600000);
    });

    it('should calculate fresh health when cache is disabled', async () => {
      mockGetCachedCodebaseHealth.mockResolvedValue(null);

      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi.fn().mockResolvedValue(
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
      mockGetCachedCodebaseHealth.mockResolvedValue(null);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(false),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      await expect(getCodebaseHealth('/test/repo', false)).rejects.toThrow('Not a git repository');
    });

    it('should identify file hotspots', async () => {
      mockGetCachedCodebaseHealth.mockResolvedValue(null);

      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);
      const hash3 = 'c'.repeat(40);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi.fn().mockResolvedValue(
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

