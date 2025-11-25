import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getStats } from '../stats';
import simpleGit from 'simple-git';
import { getCachedStats, setCachedStats } from '../../db';

// Mock dependencies
vi.mock('simple-git');
vi.mock('../../db');

const mockSimpleGit = vi.mocked(simpleGit);
const mockGetCachedStats = vi.mocked(getCachedStats);
const mockSetCachedStats = vi.mocked(setCachedStats);

describe('stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStats', () => {
    it('should return cached stats when available', async () => {
      const cachedStats = {
        summary: { totalCommits: 100, totalAuthors: 5, totalFiles: 50 },
        authors: [],
        activity: { hourOfDay: {}, dayOfWeek: {}, monthOfYear: {}, year: {} },
        extensions: {},
        locHistory: [],
      };

      mockGetCachedStats.mockResolvedValue(cachedStats);

      const result = await getStats('/test/repo', true);

      expect(result).toEqual(cachedStats);
      expect(mockGetCachedStats).toHaveBeenCalledWith('/test/repo', 3600000);
      expect(mockSimpleGit).not.toHaveBeenCalled();
    });

    it('should calculate fresh stats when cache is disabled', async () => {
      mockGetCachedStats.mockResolvedValue(null);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        log: vi.fn().mockResolvedValue({
          total: 10,
          all: [
            {
              date: '2024-01-01T10:00:00Z',
              author_name: 'Test User',
              author_email: 'test@example.com',
            },
            {
              date: '2024-01-02T11:00:00Z',
              author_name: 'Test User',
              author_email: 'test@example.com',
            },
          ],
        }),
        raw: vi
          .fn()
          .mockResolvedValueOnce('file1.ts\nfile2.js\n') // ls-files
          .mockResolvedValueOnce('2024-01-01T10:00:00Z\n10\t5\tfile1.ts\n'), // log with numstat (date format)
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await getStats('/test/repo', false);

      expect(result).toBeDefined();
      expect(result.summary.totalCommits).toBe(10);
      expect(result.summary.totalAuthors).toBe(1);
      expect(mockGit.checkIsRepo).toHaveBeenCalled();
      expect(mockGit.log).toHaveBeenCalled();
    });

    it('should throw error for non-git repository', async () => {
      mockGetCachedStats.mockResolvedValue(null);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(false),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      await expect(getStats('/test/repo', false)).rejects.toThrow('Not a git repository');
    });

    it('should cache results after calculation', async () => {
      mockGetCachedStats.mockResolvedValue(null);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        log: vi.fn().mockResolvedValue({
          total: 5,
          all: [
            {
              date: '2024-01-01T10:00:00Z',
              author_name: 'Test User',
              author_email: 'test@example.com',
            },
          ],
        }),
        raw: vi
          .fn()
          .mockResolvedValueOnce('file1.ts\n')
          .mockResolvedValueOnce('2024-01-01T10:00:00Z\n10\t5\tfile1.ts\n'),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);
      mockSetCachedStats.mockResolvedValue(undefined);

      await getStats('/test/repo', true);

      expect(mockSetCachedStats).toHaveBeenCalledWith('/test/repo', expect.any(Object));
    });
  });
});
