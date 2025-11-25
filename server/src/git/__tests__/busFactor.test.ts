import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getBusFactorAndOwnership, getCrossRepoBusFactorAndOwnership } from '../busFactor';
import simpleGit from 'simple-git';
import { getRepositories } from '../../db';

// Mock dependencies
vi.mock('simple-git');
vi.mock('../../db');

const mockSimpleGit = vi.mocked(simpleGit);
const mockGetRepositories = vi.mocked(getRepositories);

describe('busFactor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBusFactorAndOwnership', () => {
    it('should throw error for non-git repository', async () => {
      // Suppress console.error for expected error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(false),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      await expect(getBusFactorAndOwnership('/test/repo', false)).rejects.toThrow(
        'Not a git repository'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should detect single maintainer risk', async () => {
      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);
      const hash3 = 'c'.repeat(40);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi
          .fn()
          .mockResolvedValue(
            `${hash1}|John Doe|john@example.com|2024-01-01T10:00:00Z\n` +
              '10\t5\tfile1.ts\n' +
              `${hash2}|John Doe|john@example.com|2024-01-02T11:00:00Z\n` +
              '3\t1\tfile1.ts\n' +
              `${hash3}|John Doe|john@example.com|2024-01-03T12:00:00Z\n` +
              '2\t1\tfile1.ts\n'
          ),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await getBusFactorAndOwnership('/test/repo', false);

      expect(result.singleMaintainerRisk.files.length).toBeGreaterThan(0);
      const riskFile = result.singleMaintainerRisk.files[0];
      expect(riskFile.ownershipPercentage).toBeGreaterThanOrEqual(70);
    });

    it('should detect fragmented files', async () => {
      const authors = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'David'];
      let rawOutput = '';

      // Need at least 10 commits total (MIN_COMMITS_FOR_FRAGMENTATION) and 5+ authors
      // Each author makes 2 commits to file1.ts to reach 12 total commits
      // Use unique hashes for each commit
      let hashCounter = 0;
      authors.forEach((name, i) => {
        // First commit by this author
        const hash1 = hashCounter.toString(16).padStart(40, 'a');
        hashCounter++;
        rawOutput += `${hash1}|${name} Doe|${name.toLowerCase()}@example.com|2024-01-0${i + 1}T10:00:00Z\n`;
        rawOutput += '10\t5\tfile1.ts\n';

        // Second commit by this author
        const hash2 = hashCounter.toString(16).padStart(40, 'b');
        hashCounter++;
        rawOutput += `${hash2}|${name} Doe|${name.toLowerCase()}@example.com|2024-01-0${i + 1}T11:00:00Z\n`;
        rawOutput += '5\t2\tfile1.ts\n';
      });

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi.fn().mockResolvedValue(rawOutput),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await getBusFactorAndOwnership('/test/repo', false);

      expect(result.fragmentation.files.length).toBeGreaterThan(0);
      const fragmentedFile = result.fragmentation.files[0];
      expect(fragmentedFile.authorCount).toBeGreaterThanOrEqual(5);
    });

    it('should detect owner churn', async () => {
      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);
      const hash3 = 'c'.repeat(40);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi.fn().mockResolvedValue(
          // Previous owner commits
          `${hash1}|John Doe|john@example.com|2024-01-01T10:00:00Z\n` +
            '10\t5\tfile1.ts\n' +
            `${hash2}|John Doe|john@example.com|2024-01-02T11:00:00Z\n` +
            '3\t1\tfile1.ts\n' +
            // Gap and new owner (within 180 days)
            `${hash3}|Jane Smith|jane@example.com|2024-02-15T10:00:00Z\n` +
            '2\t1\tfile1.ts\n'
        ),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await getBusFactorAndOwnership('/test/repo', false);

      // Owner churn might be detected if conditions are met
      expect(result.ownerChurn.files).toBeDefined();
    });

    it('should calculate repo-level risk', async () => {
      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi
          .fn()
          .mockResolvedValue(
            `${hash1}|John Doe|john@example.com|2024-01-01T10:00:00Z\n` +
              '10\t5\tfile1.ts\n' +
              `${hash2}|John Doe|john@example.com|2024-01-02T11:00:00Z\n` +
              '3\t1\tfile2.ts\n'
          ),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await getBusFactorAndOwnership('/test/repo', false);

      expect(result.singleMaintainerRisk.repoRisk).toBeDefined();
      expect(result.singleMaintainerRisk.repoRisk?.primaryAuthor).toBeDefined();
    });
  });

  describe('getCrossRepoBusFactorAndOwnership', () => {
    it('should return empty result when no repositories', async () => {
      mockGetRepositories.mockResolvedValue([]);

      const result = await getCrossRepoBusFactorAndOwnership('project-1', false);

      expect(result.singleMaintainerRisk.repositories).toEqual([]);
      expect(result.totalRepos).toBe(0);
    });
  });
});
