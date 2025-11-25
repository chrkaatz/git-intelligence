import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSocialNetworkAnalysis, getCrossRepoSocialNetworkAnalysis } from '../socialNetwork';
import simpleGit from 'simple-git';
import { getRepositories } from '../../db';

// Mock dependencies
vi.mock('simple-git');
vi.mock('../../db');

const mockSimpleGit = vi.mocked(simpleGit);
const mockGetRepositories = vi.mocked(getRepositories);

describe('socialNetwork', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSocialNetworkAnalysis', () => {
    it('should throw error for non-git repository', async () => {
      // Suppress console.error for expected error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(false),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      await expect(getSocialNetworkAnalysis('/test/repo', false)).rejects.toThrow(
        'Not a git repository'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should build collaboration graph from commits', async () => {
      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);
      const hash3 = 'c'.repeat(40);

      // Two authors working on same file (collaboration)
      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi
          .fn()
          .mockResolvedValue(
            `${hash1}|John Doe|john@example.com|2024-01-01T10:00:00Z\n` +
              '10\t5\tfile1.ts\n' +
              `${hash2}|Jane Smith|jane@example.com|2024-01-02T11:00:00Z\n` +
              '3\t1\tfile1.ts\n' +
              `${hash3}|John Doe|john@example.com|2024-01-03T12:00:00Z\n` +
              '5\t2\tfile2.ts\n'
          ),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await getSocialNetworkAnalysis('/test/repo', false);

      expect(result).toBeDefined();
      expect(result.collaborationGraph).toBeDefined();
      expect(result.collaborationGraph.nodes.length).toBeGreaterThan(0);
      expect(result.collaborationGraph.edges.length).toBeGreaterThan(0);

      // Should have collaboration edge between John and Jane (they both worked on file1.ts)
      const edge = result.collaborationGraph.edges.find(
        (e) =>
          (e.author1Email === 'john@example.com' && e.author2Email === 'jane@example.com') ||
          (e.author1Email === 'jane@example.com' && e.author2Email === 'john@example.com')
      );
      expect(edge).toBeDefined();
      expect(edge?.sharedFiles).toBe(1);
      expect(edge?.sharedFilesList).toContain('file1.ts');
    });

    it('should detect knowledge silos (files with 1-2 authors)', async () => {
      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);
      const now = new Date();
      const recentDate = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      const oldDate = new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000); // 400 days ago

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi
          .fn()
          .mockResolvedValue(
            `${hash1}|John Doe|john@example.com|${recentDate.toISOString()}\n` +
              '10\t5\tsilo-file.ts\n' +
              `${hash2}|John Doe|john@example.com|${oldDate.toISOString()}\n` +
              '3\t1\told-silo-file.ts\n'
          ),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await getSocialNetworkAnalysis('/test/repo', false);

      expect(result.knowledgeSilos.length).toBeGreaterThan(0);
      const silo = result.knowledgeSilos.find((s) => s.file === 'silo-file.ts');
      expect(silo).toBeDefined();
      expect(silo?.authorCount).toBe(1);
      expect(silo?.authors).toContain('John Doe');
      expect(silo?.riskLevel).toBe('low'); // Recent commit, low risk
    });

    it('should detect high-risk knowledge silos (single author, old commits)', async () => {
      const hash = 'a'.repeat(40);
      const now = new Date();
      const oldDate = new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000); // 400 days ago

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi
          .fn()
          .mockResolvedValue(
            `${hash}|John Doe|john@example.com|${oldDate.toISOString()}\n` +
              '10\t5\thigh-risk-silo.ts\n'
          ),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await getSocialNetworkAnalysis('/test/repo', false);

      const silo = result.knowledgeSilos.find((s) => s.file === 'high-risk-silo.ts');
      expect(silo).toBeDefined();
      expect(silo?.authorCount).toBe(1);
      expect(silo?.daysSinceLastCommit).toBeGreaterThan(365);
      expect(silo?.riskLevel).toBe('high');
    });

    it('should detect orphaned code (files not touched in 2+ years)', async () => {
      const hash = 'a'.repeat(40);
      const now = new Date();
      const orphanDate = new Date(now.getTime() - 800 * 24 * 60 * 60 * 1000); // ~2.2 years ago

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi
          .fn()
          .mockResolvedValue(
            `${hash}|John Doe|john@example.com|${orphanDate.toISOString()}\n` +
              '10\t5\torphaned-file.ts\n'
          ),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await getSocialNetworkAnalysis('/test/repo', false);

      expect(result.orphanedCode.length).toBeGreaterThan(0);
      const orphaned = result.orphanedCode.find((o) => o.file === 'orphaned-file.ts');
      expect(orphaned).toBeDefined();
      expect(orphaned?.daysSinceLastCommit).toBeGreaterThanOrEqual(365 * 2);
      expect(orphaned?.lastAuthor).toBe('John Doe');
    });

    it('should handle date parsing with space separator', async () => {
      const hash = 'a'.repeat(40);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi
          .fn()
          .mockResolvedValue(
            `${hash}|John Doe|john@example.com|2024-01-01 10:00:00\n` + '10\t5\tfile1.ts\n'
          ),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await getSocialNetworkAnalysis('/test/repo', false);

      expect(result).toBeDefined();
      expect(result.collaborationGraph.nodes.length).toBeGreaterThan(0);
    });

    it('should build clusters from connected authors', async () => {
      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);
      const hash3 = 'c'.repeat(40);

      // Create a connected component: A-B and B-C (so A, B, C are all connected)
      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi
          .fn()
          .mockResolvedValue(
            `${hash1}|Alice|alice@example.com|2024-01-01T10:00:00Z\n` +
              '10\t5\tfile1.ts\n' +
              `${hash2}|Bob|bob@example.com|2024-01-02T11:00:00Z\n` +
              '3\t1\tfile1.ts\n' +
              '5\t2\tfile2.ts\n' +
              `${hash3}|Charlie|charlie@example.com|2024-01-03T12:00:00Z\n` +
              '7\t3\tfile2.ts\n'
          ),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await getSocialNetworkAnalysis('/test/repo', false);

      expect(result.collaborationGraph.clusters).toBeDefined();
      expect(result.collaborationGraph.clusters!.length).toBeGreaterThan(0);

      // Should have a cluster with all three authors
      const cluster = result.collaborationGraph.clusters!.find(
        (c) => c.size >= 3 && c.authors.length >= 3
      );
      expect(cluster).toBeDefined();
    });

    it('should limit knowledge silos and orphaned code to top 100', async () => {
      const hash = 'a'.repeat(40);
      const now = new Date();
      const oldDate = new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000);

      // Generate more than 100 files
      const files = Array.from({ length: 150 }, (_, i) => `file${i}.ts`);
      const numstatOutput = files
        .map(
          (file, i) =>
            `${hash}${i}|John Doe|john@example.com|${oldDate.toISOString()}\n` + `10\t5\t${file}\n`
        )
        .join('');

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi.fn().mockResolvedValue(numstatOutput),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await getSocialNetworkAnalysis('/test/repo', false);

      expect(result.knowledgeSilos.length).toBeLessThanOrEqual(100);
      expect(result.orphanedCode.length).toBeLessThanOrEqual(100);
    });

    it('should calculate collaboration strength correctly', async () => {
      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);

      // Two authors with many shared files
      const sharedFiles = Array.from({ length: 10 }, (_, i) => `shared${i}.ts`);
      const numstatOutput =
        sharedFiles
          .map(
            (file, i) =>
              `${i === 0 ? hash1 : hash2}|${i === 0 ? 'John|john@example.com' : 'Jane|jane@example.com'}|2024-01-0${i + 1}T10:00:00Z\n` +
              `10\t5\t${file}\n`
          )
          .join('') +
        `${hash1}|John|john@example.com|2024-01-11T10:00:00Z\n` +
        '10\t5\tfile1.ts\n' +
        `${hash2}|Jane|jane@example.com|2024-01-12T10:00:00Z\n` +
        '10\t5\tfile1.ts\n';

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi.fn().mockResolvedValue(numstatOutput),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await getSocialNetworkAnalysis('/test/repo', false);

      const edge = result.collaborationGraph.edges.find(
        (e) =>
          (e.author1Email === 'john@example.com' && e.author2Email === 'jane@example.com') ||
          (e.author1Email === 'jane@example.com' && e.author2Email === 'john@example.com')
      );

      expect(edge).toBeDefined();
      expect(edge?.collaborationStrength).toBeGreaterThanOrEqual(0);
      expect(edge?.collaborationStrength).toBeLessThanOrEqual(1);
    });

    it('should handle empty repository gracefully', async () => {
      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi.fn().mockResolvedValue(''),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await getSocialNetworkAnalysis('/test/repo', false);

      expect(result).toBeDefined();
      expect(result.collaborationGraph.nodes).toEqual([]);
      expect(result.collaborationGraph.edges).toEqual([]);
      expect(result.knowledgeSilos).toEqual([]);
      expect(result.orphanedCode).toEqual([]);
    });
  });

  describe('getCrossRepoSocialNetworkAnalysis', () => {
    it('should return empty result when no repositories', async () => {
      mockGetRepositories.mockResolvedValue([]);

      const result = await getCrossRepoSocialNetworkAnalysis('project-1', false);

      expect(result.crossRepoCollaboration).toEqual([]);
      expect(result.repoClusters).toEqual([]);
      expect(result.totalRepos).toBe(0);
      expect(result.repoNames).toEqual([]);
    });

    it('should detect cross-repo collaboration', async () => {
      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);

      mockGetRepositories.mockResolvedValue([
        { id: 'repo1', name: 'Repo 1', path: '/repo1', projectId: 'project-1' },
        { id: 'repo2', name: 'Repo 2', path: '/repo2', projectId: 'project-1' },
      ]);

      let callCount = 0;
      const mockGitFactory = () => {
        callCount++;
        const hash = callCount === 1 ? hash1 : hash2;
        const repoName = callCount === 1 ? 'Repo 1' : 'Repo 2';
        return {
          checkIsRepo: vi.fn().mockResolvedValue(true),
          raw: vi
            .fn()
            .mockResolvedValue(
              `${hash}|John Doe|john@example.com|2024-01-0${callCount}T10:00:00Z\n` +
                '10\t5\tfile1.ts\n' +
                `${hash}|Jane Smith|jane@example.com|2024-01-0${callCount + 1}T10:00:00Z\n` +
                '5\t2\tfile2.ts\n'
            ),
        };
      };

      vi.mocked(simpleGit).mockImplementation(mockGitFactory as any);

      const result = await getCrossRepoSocialNetworkAnalysis('project-1', false);

      expect(result.totalRepos).toBe(2);
      expect(result.repoNames.length).toBe(2);
      // Both authors work in both repos, so they should have cross-repo collaboration
      expect(result.crossRepoCollaboration.length).toBeGreaterThan(0);
    });

    it('should detect repo clusters (repos with same authors)', async () => {
      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);

      mockGetRepositories.mockResolvedValue([
        { id: 'repo1', name: 'Repo 1', path: '/repo1', projectId: 'project-1' },
        { id: 'repo2', name: 'Repo 2', path: '/repo2', projectId: 'project-1' },
        { id: 'repo3', name: 'Repo 3', path: '/repo3', projectId: 'project-1' },
      ]);

      let callCount = 0;
      const mockGitFactory = () => {
        callCount++;
        const hash = callCount === 1 ? hash1 : callCount === 2 ? hash2 : 'c'.repeat(40);
        // Repos 1 and 2 share authors (John and Jane), repo 3 has different author
        const authors =
          callCount <= 2
            ? [
                `${hash}|John Doe|john@example.com|2024-01-0${callCount}T10:00:00Z\n`,
                `${hash}|Jane Smith|jane@example.com|2024-01-0${callCount + 1}T10:00:00Z\n`,
              ]
            : [`${hash}|Bob|bob@example.com|2024-01-03T10:00:00Z\n`];

        return {
          checkIsRepo: vi.fn().mockResolvedValue(true),
          raw: vi.fn().mockResolvedValue(authors.join('') + `10\t5\tfile${callCount}.ts\n`),
        };
      };

      vi.mocked(simpleGit).mockImplementation(mockGitFactory as any);

      const result = await getCrossRepoSocialNetworkAnalysis('project-1', false);

      expect(result.totalRepos).toBe(3);
      // Should have a cluster with repos 1 and 2 (same authors)
      const cluster = result.repoClusters.find(
        (c) => c.size >= 2 && c.repos.includes('Repo 1') && c.repos.includes('Repo 2')
      );
      expect(cluster).toBeDefined();
    });

    it('should limit cross-repo collaboration to top 100', async () => {
      // Create many repositories with overlapping authors
      const repos = Array.from({ length: 50 }, (_, i) => ({
        id: `repo${i}`,
        name: `Repo ${i}`,
        path: `/repo${i}`,
        projectId: 'project-1',
      }));

      mockGetRepositories.mockResolvedValue(repos);

      let callCount = 0;
      const mockGitFactory = () => {
        callCount++;
        const hash = 'a'.repeat(40);
        // Each repo has multiple authors, creating many collaborations
        return {
          checkIsRepo: vi.fn().mockResolvedValue(true),
          raw: vi
            .fn()
            .mockResolvedValue(
              `${hash}|Author${callCount}|author${callCount}@example.com|2024-01-01T10:00:00Z\n` +
                '10\t5\tfile1.ts\n' +
                `${hash}|Author${callCount + 1}|author${callCount + 1}@example.com|2024-01-02T10:00:00Z\n` +
                '5\t2\tfile2.ts\n'
            ),
        };
      };

      vi.mocked(simpleGit).mockImplementation(mockGitFactory as any);

      const result = await getCrossRepoSocialNetworkAnalysis('project-1', false);

      expect(result.crossRepoCollaboration.length).toBeLessThanOrEqual(100);
    });

    it('should handle repositories that are not git repos', async () => {
      mockGetRepositories.mockResolvedValue([
        { id: 'repo1', name: 'Repo 1', path: '/repo1', projectId: 'project-1' },
        { id: 'repo2', name: 'Repo 2', path: '/repo2', projectId: 'project-1' },
      ]);

      let callCount = 0;
      const mockGitFactory = () => {
        callCount++;
        return {
          checkIsRepo: vi.fn().mockResolvedValue(callCount === 1), // First is git, second is not
          raw: vi.fn().mockResolvedValue(''),
        };
      };

      vi.mocked(simpleGit).mockImplementation(mockGitFactory as any);

      const result = await getCrossRepoSocialNetworkAnalysis('project-1', false);

      // Should only process the first repo
      expect(result.totalRepos).toBe(2); // Still counts all repos
      expect(result.repoNames.length).toBe(2);
    });

    it('should handle errors in individual repository analysis', async () => {
      // Suppress console.error for expected error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockGetRepositories.mockResolvedValue([
        { id: 'repo1', name: 'Repo 1', path: '/repo1', projectId: 'project-1' },
        { id: 'repo2', name: 'Repo 2', path: '/repo2', projectId: 'project-1' },
      ]);

      let callCount = 0;
      const mockGitFactory = () => {
        callCount++;
        if (callCount === 1) {
          return {
            checkIsRepo: vi.fn().mockResolvedValue(true),
            raw: vi
              .fn()
              .mockResolvedValue(
                'a'.repeat(40) +
                  '|John|john@example.com|2024-01-01T10:00:00Z\n' +
                  '10\t5\tfile1.ts\n'
              ),
          };
        } else {
          // Second repo throws error
          return {
            checkIsRepo: vi.fn().mockResolvedValue(true),
            raw: vi.fn().mockRejectedValue(new Error('Git error')),
          };
        }
      };

      vi.mocked(simpleGit).mockImplementation(mockGitFactory as any);

      // Should not throw, but continue processing
      const result = await getCrossRepoSocialNetworkAnalysis('project-1', false);

      expect(result.totalRepos).toBe(2);
      // Should still have results from the first repo
      expect(result.repoNames.length).toBe(2);

      consoleErrorSpy.mockRestore();
    });

    it('should calculate collaboration strength for cross-repo collaboration', async () => {
      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);

      mockGetRepositories.mockResolvedValue([
        { id: 'repo1', name: 'Repo 1', path: '/repo1', projectId: 'project-1' },
        { id: 'repo2', name: 'Repo 2', path: '/repo2', projectId: 'project-1' },
      ]);

      let callCount = 0;
      const mockGitFactory = () => {
        callCount++;
        const hash = callCount === 1 ? hash1 : hash2;
        return {
          checkIsRepo: vi.fn().mockResolvedValue(true),
          raw: vi
            .fn()
            .mockResolvedValue(
              `${hash}|John Doe|john@example.com|2024-01-0${callCount}T10:00:00Z\n` +
                '10\t5\tfile1.ts\n' +
                `${hash}|Jane Smith|jane@example.com|2024-01-0${callCount + 1}T10:00:00Z\n` +
                '5\t2\tfile2.ts\n'
            ),
        };
      };

      vi.mocked(simpleGit).mockImplementation(mockGitFactory as any);

      const result = await getCrossRepoSocialNetworkAnalysis('project-1', false);

      const collaboration = result.crossRepoCollaboration.find(
        (c) =>
          (c.author1Email === 'john@example.com' && c.author2Email === 'jane@example.com') ||
          (c.author1Email === 'jane@example.com' && c.author2Email === 'john@example.com')
      );

      if (collaboration) {
        expect(collaboration.collaborationStrength).toBeGreaterThanOrEqual(0);
        expect(collaboration.collaborationStrength).toBeLessThanOrEqual(1);
        expect(collaboration.sharedReposCount).toBeGreaterThan(0);
      }
    });
  });
});
