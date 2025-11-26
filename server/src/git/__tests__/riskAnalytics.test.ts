import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getRiskAnalytics, getCrossRepoRiskAnalytics } from '../riskAnalytics';
import simpleGit from 'simple-git';
import { getRepositories } from '../../db';
import { getCodebaseHealth } from '../codebaseHealth';
import { getBusFactorAndOwnership } from '../busFactor';

// Mock dependencies
vi.mock('simple-git');
vi.mock('../../db');
vi.mock('../codebaseHealth');
vi.mock('../busFactor');

const mockSimpleGit = vi.mocked(simpleGit);
const mockGetRepositories = vi.mocked(getRepositories);
const mockGetCodebaseHealth = vi.mocked(getCodebaseHealth);
const mockGetBusFactorAndOwnership = vi.mocked(getBusFactorAndOwnership);

describe('riskAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRiskAnalytics', () => {
    it('should throw error for non-git repository', async () => {
      // Suppress console.error for expected error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(false),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      await expect(getRiskAnalytics('/test/repo', false)).rejects.toThrow('Not a git repository');

      consoleErrorSpy.mockRestore();
    });

    it('should calculate risk analytics with high-risk hotspots', async () => {
      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi
          .fn()
          .mockResolvedValueOnce(
            // First call: numstat with author info
            `${hash1}|john@example.com|2024-01-01T10:00:00Z\n` +
              '100\t50\tfile1.ts\n' +
              `${hash2}|john@example.com|2024-01-02T11:00:00Z\n` +
              '200\t100\tfile1.ts\n'
          )
          .mockResolvedValueOnce(
            // Second call: trend analysis (reverse order)
            `${hash1}|2024-01-01T10:00:00Z\n` +
              '100\t50\tfile1.ts\n' +
              `${hash2}|2024-01-02T11:00:00Z\n` +
              '200\t100\tfile1.ts\n'
          ),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      // Mock codebase health with high churn and complexity
      mockGetCodebaseHealth.mockResolvedValue({
        hotspots: {
          files: [{ file: 'file1.ts', commits: 15, percentage: 50 }],
          directories: [],
        },
        changeCoupling: {
          pairs: [{ file1: 'file1.ts', file2: 'file2.ts', coChanges: 5 }],
        },
        stability: { files: [] },
        complexity: {
          averageDiffSizes: [{ file: 'file1.ts', averageDiffSize: 150 }],
          largestDiffs: [],
          mostRewritten: [],
        },
      });

      // Mock bus factor with single maintainer (low ownership diversity)
      mockGetBusFactorAndOwnership.mockResolvedValue({
        singleMaintainerRisk: {
          files: [
            {
              file: 'file1.ts',
              primaryAuthor: 'John Doe',
              ownershipPercentage: 100,
              commits: 15,
            },
          ],
          repoRisk: null,
        },
        fragmentation: { files: [] },
        ownerChurn: { files: [] },
      });

      const result = await getRiskAnalytics('/test/repo', false);

      expect(result).toBeDefined();
      expect(result.highRiskHotspots).toBeDefined();
      expect(result.highRiskHotspots.length).toBeGreaterThan(0);

      const hotspot = result.highRiskHotspots[0];
      expect(hotspot.file).toBe('file1.ts');
      expect(hotspot.riskScore).toBeGreaterThanOrEqual(40);
      expect(hotspot.churn).toBe(15);
      expect(hotspot.complexity).toBe(150);
      expect(hotspot.ownershipDiversity).toBe(1);
      expect(['low', 'medium', 'high']).toContain(hotspot.riskLevel);
    });

    it('should identify temporal coupling hotspots', async () => {
      const hash1 = 'a'.repeat(40);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi
          .fn()
          .mockResolvedValueOnce(
            `${hash1}|john@example.com|2024-01-01T10:00:00Z\n` + '10\t5\tfile1.ts\n'
          )
          .mockResolvedValueOnce(`${hash1}|2024-01-01T10:00:00Z\n` + '10\t5\tfile1.ts\n'),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      // Mock codebase health with high coupling
      mockGetCodebaseHealth.mockResolvedValue({
        hotspots: {
          files: [{ file: 'file1.ts', commits: 5, percentage: 20 }],
          directories: [],
        },
        changeCoupling: {
          pairs: [
            { file1: 'file1.ts', file2: 'file2.ts', coChanges: 3 },
            { file1: 'file1.ts', file2: 'file3.ts', coChanges: 2 },
            { file1: 'file1.ts', file2: 'file4.ts', coChanges: 1 },
            { file1: 'file1.ts', file2: 'file5.ts', coChanges: 1 },
          ],
        },
        stability: { files: [] },
        complexity: {
          averageDiffSizes: [{ file: 'file1.ts', averageDiffSize: 50 }],
          largestDiffs: [],
          mostRewritten: [],
        },
      });

      mockGetBusFactorAndOwnership.mockResolvedValue({
        singleMaintainerRisk: { files: [], repoRisk: null },
        fragmentation: { files: [] },
        ownerChurn: { files: [] },
      });

      const result = await getRiskAnalytics('/test/repo', false);

      expect(result.temporalCouplingHotspots).toBeDefined();
      expect(result.temporalCouplingHotspots.length).toBeGreaterThan(0);

      const coupling = result.temporalCouplingHotspots[0];
      expect(coupling.file).toBe('file1.ts');
      expect(coupling.couplingCount).toBeGreaterThanOrEqual(3);
      expect(coupling.relatedFiles.length).toBeGreaterThan(0);
      expect(['low', 'medium', 'high']).toContain(coupling.riskLevel);
    });

    it('should calculate risky file trends', async () => {
      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);
      const hash3 = 'c'.repeat(40);

      // Create dates for trend analysis (last 6 months)
      const now = new Date();
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi
          .fn()
          .mockResolvedValueOnce(
            // First call: numstat with author info
            `${hash1}|john@example.com|${sixMonthsAgo.toISOString()}\n` +
              '100\t50\tfile1.ts\n' +
              `${hash2}|john@example.com|${threeMonthsAgo.toISOString()}\n` +
              '200\t100\tfile1.ts\n' +
              `${hash3}|john@example.com|${oneMonthAgo.toISOString()}\n` +
              '300\t150\tfile1.ts\n'
          )
          .mockResolvedValueOnce(
            // Second call: trend analysis (reverse order)
            `${hash1}|${sixMonthsAgo.toISOString()}\n` +
              '100\t50\tfile1.ts\n' +
              `${hash2}|${threeMonthsAgo.toISOString()}\n` +
              '200\t100\tfile1.ts\n' +
              `${hash3}|${oneMonthAgo.toISOString()}\n` +
              '300\t150\tfile1.ts\n'
          ),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      // Mock codebase health with high-risk file
      mockGetCodebaseHealth.mockResolvedValue({
        hotspots: {
          files: [{ file: 'file1.ts', commits: 20, percentage: 60 }],
          directories: [],
        },
        changeCoupling: { pairs: [] },
        stability: { files: [] },
        complexity: {
          averageDiffSizes: [{ file: 'file1.ts', averageDiffSize: 200 }],
          largestDiffs: [],
          mostRewritten: [],
        },
      });

      mockGetBusFactorAndOwnership.mockResolvedValue({
        singleMaintainerRisk: {
          files: [
            {
              file: 'file1.ts',
              primaryAuthor: 'John Doe',
              ownershipPercentage: 100,
              commits: 20,
            },
          ],
          repoRisk: null,
        },
        fragmentation: { files: [] },
        ownerChurn: { files: [] },
      });

      const result = await getRiskAnalytics('/test/repo', false);

      expect(result.riskyFileTrends).toBeDefined();
      expect(result.riskyFileTrends.length).toBeGreaterThan(0);

      const trend = result.riskyFileTrends[0];
      expect(trend.file).toBe('file1.ts');
      expect(trend.currentRiskScore).toBeGreaterThan(0);
      expect(trend.trendPoints.length).toBeGreaterThan(0);
      expect(['increasing', 'decreasing', 'stable']).toContain(trend.trendDirection);
      expect(['low', 'medium', 'high']).toContain(trend.riskLevel);
    });

    it('should filter out low-risk files', async () => {
      const hash1 = 'a'.repeat(40);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi
          .fn()
          .mockResolvedValueOnce(
            `${hash1}|john@example.com|2024-01-01T10:00:00Z\n` + '5\t2\tfile1.ts\n'
          )
          .mockResolvedValueOnce(`${hash1}|2024-01-01T10:00:00Z\n` + '5\t2\tfile1.ts\n'),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      // Mock codebase health with low churn and complexity
      mockGetCodebaseHealth.mockResolvedValue({
        hotspots: {
          files: [{ file: 'file1.ts', commits: 2, percentage: 5 }],
          directories: [],
        },
        changeCoupling: { pairs: [] },
        stability: { files: [] },
        complexity: {
          averageDiffSizes: [{ file: 'file1.ts', averageDiffSize: 10 }],
          largestDiffs: [],
          mostRewritten: [],
        },
      });

      mockGetBusFactorAndOwnership.mockResolvedValue({
        singleMaintainerRisk: {
          files: [
            {
              file: 'file1.ts',
              primaryAuthor: 'John Doe',
              ownershipPercentage: 100,
              commits: 2,
            },
          ],
          repoRisk: null,
        },
        fragmentation: { files: [] },
        ownerChurn: { files: [] },
      });

      const result = await getRiskAnalytics('/test/repo', false);

      // Low-risk file should not appear in high-risk hotspots
      // (unless it meets the minimum thresholds)
      const lowRiskFile = result.highRiskHotspots.find((h) => h.file === 'file1.ts');
      // File with only 2 commits, 10 complexity, and 1 owner should have low risk score
      if (lowRiskFile) {
        expect(lowRiskFile.riskScore).toBeLessThan(40);
      }
    });

    it('should handle files with multiple authors', async () => {
      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);
      const hash3 = 'c'.repeat(40);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi
          .fn()
          .mockResolvedValueOnce(
            // Multiple authors for same file
            `${hash1}|john@example.com|2024-01-01T10:00:00Z\n` +
              '100\t50\tfile1.ts\n' +
              `${hash2}|jane@example.com|2024-01-02T11:00:00Z\n` +
              '200\t100\tfile1.ts\n' +
              `${hash3}|bob@example.com|2024-01-03T12:00:00Z\n` +
              '50\t25\tfile1.ts\n'
          )
          .mockResolvedValueOnce(
            `${hash1}|2024-01-01T10:00:00Z\n` +
              '100\t50\tfile1.ts\n' +
              `${hash2}|2024-01-02T11:00:00Z\n` +
              '200\t100\tfile1.ts\n' +
              `${hash3}|2024-01-03T12:00:00Z\n` +
              '50\t25\tfile1.ts\n'
          ),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      mockGetCodebaseHealth.mockResolvedValue({
        hotspots: {
          files: [{ file: 'file1.ts', commits: 15, percentage: 50 }],
          directories: [],
        },
        changeCoupling: { pairs: [] },
        stability: { files: [] },
        complexity: {
          averageDiffSizes: [{ file: 'file1.ts', averageDiffSize: 150 }],
          largestDiffs: [],
          mostRewritten: [],
        },
      });

      // File has multiple authors (not in single maintainer risk)
      mockGetBusFactorAndOwnership.mockResolvedValue({
        singleMaintainerRisk: { files: [], repoRisk: null },
        fragmentation: { files: [] },
        ownerChurn: { files: [] },
      });

      const result = await getRiskAnalytics('/test/repo', false);

      // File should have ownership diversity > 1
      const hotspot = result.highRiskHotspots.find((h) => h.file === 'file1.ts');
      if (hotspot) {
        expect(hotspot.ownershipDiversity).toBeGreaterThan(1);
      }
    });

    it('should limit results to top N items', async () => {
      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi.fn().mockResolvedValueOnce('').mockResolvedValueOnce(''),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      // Create many high-risk files
      const manyHotspots = Array.from({ length: 100 }, (_, i) => ({
        file: `file${i}.ts`,
        commits: 20 + i,
        percentage: 5,
      }));

      const manyComplexity = Array.from({ length: 100 }, (_, i) => ({
        file: `file${i}.ts`,
        averageDiffSize: 200 + i * 10,
      }));

      mockGetCodebaseHealth.mockResolvedValue({
        hotspots: {
          files: manyHotspots,
          directories: [],
        },
        changeCoupling: { pairs: [] },
        stability: { files: [] },
        complexity: {
          averageDiffSizes: manyComplexity,
          largestDiffs: [],
          mostRewritten: [],
        },
      });

      mockGetBusFactorAndOwnership.mockResolvedValue({
        singleMaintainerRisk: {
          files: manyHotspots.map((h) => ({
            file: h.file,
            primaryAuthor: 'John Doe',
            ownershipPercentage: 100,
            commits: h.commits,
          })),
          repoRisk: null,
        },
        fragmentation: { files: [] },
        ownerChurn: { files: [] },
      });

      const result = await getRiskAnalytics('/test/repo', false);

      // Should limit to top 50 high-risk hotspots
      expect(result.highRiskHotspots.length).toBeLessThanOrEqual(50);
      // Should limit to top 30 temporal coupling hotspots
      expect(result.temporalCouplingHotspots.length).toBeLessThanOrEqual(30);
      // Should limit to top 20 risky file trends
      expect(result.riskyFileTrends.length).toBeLessThanOrEqual(20);
    });
  });

  describe('getCrossRepoRiskAnalytics', () => {
    it('should return empty result when no repositories', async () => {
      mockGetRepositories.mockResolvedValue([]);

      const result = await getCrossRepoRiskAnalytics('project-1', false);

      expect(result.highRiskHotspots.repositories).toEqual([]);
      expect(result.highRiskHotspots.aggregatedFiles).toEqual([]);
      expect(result.temporalCouplingHotspots.repositories).toEqual([]);
      expect(result.temporalCouplingHotspots.aggregatedFiles).toEqual([]);
      expect(result.riskyFileTrends.repositories).toEqual([]);
      expect(result.riskyFileTrends.aggregatedFiles).toEqual([]);
      expect(result.totalRepos).toBe(0);
      expect(result.repoNames).toEqual([]);
    });

    it('should aggregate analytics across repositories', async () => {
      // Mock repositories
      mockGetRepositories.mockResolvedValue([
        { id: 'repo1', name: 'Repo 1', path: '/repo1', projectId: 'project-1' },
        { id: 'repo2', name: 'Repo 2', path: '/repo2', projectId: 'project-1' },
      ]);

      // Mock git for each repo
      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);

      let callCount = 0;
      const mockGitFactory = () => {
        callCount++;
        const hash = callCount === 1 ? hash1 : hash2;
        return {
          checkIsRepo: vi.fn().mockResolvedValue(true),
          raw: vi
            .fn()
            .mockResolvedValueOnce(
              `${hash}|john@example.com|2024-01-0${callCount}T10:00:00Z\n` + '100\t50\tfile1.ts\n'
            )
            .mockResolvedValueOnce(
              `${hash}|2024-01-0${callCount}T10:00:00Z\n` + '100\t50\tfile1.ts\n'
            ),
        };
      };

      vi.mocked(simpleGit).mockImplementation(mockGitFactory as any);

      // Mock codebase health for each repo
      mockGetCodebaseHealth.mockResolvedValue({
        hotspots: {
          files: [{ file: 'file1.ts', commits: 15, percentage: 50 }],
          directories: [],
        },
        changeCoupling: { pairs: [] },
        stability: { files: [] },
        complexity: {
          averageDiffSizes: [{ file: 'file1.ts', averageDiffSize: 150 }],
          largestDiffs: [],
          mostRewritten: [],
        },
      });

      // Mock bus factor for each repo
      mockGetBusFactorAndOwnership.mockResolvedValue({
        singleMaintainerRisk: {
          files: [
            {
              file: 'file1.ts',
              primaryAuthor: 'John Doe',
              ownershipPercentage: 100,
              commits: 15,
            },
          ],
          repoRisk: null,
        },
        fragmentation: { files: [] },
        ownerChurn: { files: [] },
      });

      const result = await getCrossRepoRiskAnalytics('project-1', false);

      expect(result.totalRepos).toBe(2);
      expect(result.repoNames.length).toBe(2);
      expect(result.highRiskHotspots.repositories.length).toBe(2);
      expect(result.highRiskHotspots.aggregatedFiles.length).toBeGreaterThan(0);

      // Check that aggregated files have repo prefix
      const aggregatedFile = result.highRiskHotspots.aggregatedFiles[0];
      expect(aggregatedFile.file).toContain(':');
    });

    it('should handle errors for individual repositories gracefully', async () => {
      // Suppress console.error for expected error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockGetRepositories.mockResolvedValue([
        { id: 'repo1', name: 'Repo 1', path: '/repo1', projectId: 'project-1' },
        { id: 'repo2', name: 'Repo 2', path: '/repo2', projectId: 'project-1' },
      ]);

      const hash1 = 'a'.repeat(40);

      let callCount = 0;
      const mockGitFactory = () => {
        callCount++;
        if (callCount === 1) {
          // First repo succeeds
          return {
            checkIsRepo: vi.fn().mockResolvedValue(true),
            raw: vi
              .fn()
              .mockResolvedValueOnce(
                `${hash1}|john@example.com|2024-01-01T10:00:00Z\n` + '100\t50\tfile1.ts\n'
              )
              .mockResolvedValueOnce(`${hash1}|2024-01-01T10:00:00Z\n` + '100\t50\tfile1.ts\n'),
          };
        } else {
          // Second repo fails
          return {
            checkIsRepo: vi.fn().mockResolvedValue(false),
          };
        }
      };

      vi.mocked(simpleGit).mockImplementation(mockGitFactory as any);

      mockGetCodebaseHealth.mockResolvedValue({
        hotspots: {
          files: [{ file: 'file1.ts', commits: 15, percentage: 50 }],
          directories: [],
        },
        changeCoupling: { pairs: [] },
        stability: { files: [] },
        complexity: {
          averageDiffSizes: [{ file: 'file1.ts', averageDiffSize: 150 }],
          largestDiffs: [],
          mostRewritten: [],
        },
      });

      mockGetBusFactorAndOwnership.mockResolvedValue({
        singleMaintainerRisk: {
          files: [
            {
              file: 'file1.ts',
              primaryAuthor: 'John Doe',
              ownershipPercentage: 100,
              commits: 15,
            },
          ],
          repoRisk: null,
        },
        fragmentation: { files: [] },
        ownerChurn: { files: [] },
      });

      const result = await getCrossRepoRiskAnalytics('project-1', false);

      // Should still process the first repo successfully
      expect(result.totalRepos).toBe(2);
      expect(result.highRiskHotspots.repositories.length).toBe(1); // Only one successful

      consoleErrorSpy.mockRestore();
    });

    it('should aggregate and sort results correctly', async () => {
      mockGetRepositories.mockResolvedValue([
        { id: 'repo1', name: 'Repo 1', path: '/repo1', projectId: 'project-1' },
        { id: 'repo2', name: 'Repo 2', path: '/repo2', projectId: 'project-1' },
      ]);

      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);

      let callCount = 0;
      const mockGitFactory = () => {
        callCount++;
        const hash = callCount === 1 ? hash1 : hash2;
        return {
          checkIsRepo: vi.fn().mockResolvedValue(true),
          raw: vi
            .fn()
            .mockResolvedValueOnce(
              `${hash}|john@example.com|2024-01-0${callCount}T10:00:00Z\n` + '100\t50\tfile1.ts\n'
            )
            .mockResolvedValueOnce(
              `${hash}|2024-01-0${callCount}T10:00:00Z\n` + '100\t50\tfile1.ts\n'
            ),
        };
      };

      vi.mocked(simpleGit).mockImplementation(mockGitFactory as any);

      // First repo has higher risk
      let repoCallCount = 0;
      mockGetCodebaseHealth.mockImplementation(() => {
        repoCallCount++;
        if (repoCallCount === 1) {
          return Promise.resolve({
            hotspots: {
              files: [{ file: 'file1.ts', commits: 20, percentage: 50 }],
              directories: [],
            },
            changeCoupling: { pairs: [] },
            stability: { files: [] },
            complexity: {
              averageDiffSizes: [{ file: 'file1.ts', averageDiffSize: 200 }],
              largestDiffs: [],
              mostRewritten: [],
            },
          });
        } else {
          return Promise.resolve({
            hotspots: {
              files: [{ file: 'file1.ts', commits: 10, percentage: 30 }],
              directories: [],
            },
            changeCoupling: { pairs: [] },
            stability: { files: [] },
            complexity: {
              averageDiffSizes: [{ file: 'file1.ts', averageDiffSize: 100 }],
              largestDiffs: [],
              mostRewritten: [],
            },
          });
        }
      });

      mockGetBusFactorAndOwnership.mockResolvedValue({
        singleMaintainerRisk: {
          files: [
            {
              file: 'file1.ts',
              primaryAuthor: 'John Doe',
              ownershipPercentage: 100,
              commits: 15,
            },
          ],
          repoRisk: null,
        },
        fragmentation: { files: [] },
        ownerChurn: { files: [] },
      });

      const result = await getCrossRepoRiskAnalytics('project-1', false);

      // Aggregated files should be sorted by risk score (descending)
      const aggregated = result.highRiskHotspots.aggregatedFiles;
      if (aggregated.length > 1) {
        for (let i = 0; i < aggregated.length - 1; i++) {
          expect(aggregated[i].riskScore).toBeGreaterThanOrEqual(aggregated[i + 1].riskScore);
        }
      }
    });
  });
});
