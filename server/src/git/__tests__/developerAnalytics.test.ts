import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDeveloperAnalytics, getCrossRepoDeveloperAnalytics } from '../developerAnalytics';
import simpleGit from 'simple-git';
import { getRepositories } from '../../db';

// Mock dependencies
vi.mock('simple-git');
vi.mock('../../db');

const mockSimpleGit = vi.mocked(simpleGit);
const mockGetRepositories = vi.mocked(getRepositories);

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
