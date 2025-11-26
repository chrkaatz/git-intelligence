import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTechnicalDebtIndicators, getCrossRepoTechnicalDebtIndicators } from '../technicalDebt';
import simpleGit from 'simple-git';
import {
  getRepositories,
  getCachedTechnicalDebtIndicators,
  setCachedTechnicalDebtIndicators,
} from '../../db';
import fs from 'fs';
import path from 'path';

// Mock dependencies
vi.mock('simple-git');
vi.mock('../../db');
vi.mock('fs');
vi.mock('path');

const mockSimpleGit = vi.mocked(simpleGit);
const mockGetRepositories = vi.mocked(getRepositories);
const mockGetCachedTechnicalDebtIndicators = vi.mocked(getCachedTechnicalDebtIndicators);
const mockSetCachedTechnicalDebtIndicators = vi.mocked(setCachedTechnicalDebtIndicators);
const mockFs = vi.mocked(fs);
const mockPath = vi.mocked(path);

describe('technicalDebt', () => {
  // Helper function to create a mock git instance that handles all calls
  function createMockGit(
    overrides: {
      hugeCommits?: string;
      wipCommits?: string;
      quickFixCommits?: string;
      commentedOutCode?: string;
      lsFiles?: string;
      forEachRef?: string;
      branchMerged?: string;
      lockfileLog?: string;
      showRefMain?: boolean;
    } = {}
  ) {
    return {
      checkIsRepo: vi.fn().mockResolvedValue(true),
      raw: vi.fn().mockImplementation((args: string[]) => {
        const cmd = args[0];
        const argsStr = args.join(' ');

        // show-ref for default branch detection
        if (cmd === 'show-ref' && argsStr.includes('refs/heads/main')) {
          return overrides.showRefMain !== false
            ? Promise.resolve('')
            : Promise.reject(new Error('Not found'));
        }
        if (
          cmd === 'show-ref' &&
          (argsStr.includes('refs/heads/master') || argsStr.includes('refs/heads/develop'))
        ) {
          return Promise.reject(new Error('Not found'));
        }

        // huge commits
        if (
          cmd === 'log' &&
          argsStr.includes('--numstat') &&
          argsStr.includes('%H|%ad|%an|%ae|%s')
        ) {
          return Promise.resolve(overrides.hugeCommits || '');
        }

        // commented-out code
        if (cmd === 'log' && argsStr.includes('-100')) {
          return Promise.resolve(overrides.commentedOutCode || '');
        }

        // WIP and quick fix commits (both use same log command, return combined)
        if (
          cmd === 'log' &&
          argsStr.includes('%H|%ad|%an|%ae|%s') &&
          !argsStr.includes('--numstat') &&
          !argsStr.includes('-100')
        ) {
          let result = '';
          if (overrides.wipCommits !== undefined) result += overrides.wipCommits;
          if (overrides.quickFixCommits !== undefined) result += overrides.quickFixCommits;
          return Promise.resolve(result || '');
        }

        // ls-files
        if (cmd === 'ls-files') {
          return Promise.resolve(overrides.lsFiles || '');
        }

        // for-each-ref
        if (cmd === 'for-each-ref') {
          return Promise.resolve(overrides.forEachRef || '');
        }

        // branch --merged
        if (cmd === 'branch' && argsStr.includes('--merged')) {
          return Promise.resolve(overrides.branchMerged || '');
        }

        // log for lockfiles
        if (cmd === 'log' && argsStr.includes('--format=%H|%ad')) {
          return Promise.resolve(overrides.lockfileLog || '');
        }

        // show for diff
        if (cmd === 'show') {
          return Promise.resolve('');
        }

        // ls-tree
        if (cmd === 'ls-tree') {
          return Promise.resolve('');
        }

        // log --reverse
        if (cmd === 'log' && argsStr.includes('--reverse')) {
          return Promise.resolve('');
        }

        // merge-base
        if (cmd === 'merge-base') {
          return Promise.resolve('a'.repeat(40));
        }

        // rev-list
        if (cmd === 'rev-list') {
          return Promise.resolve('5');
        }

        // diff-filter
        if (argsStr.includes('--diff-filter=A')) {
          return Promise.resolve('');
        }

        return Promise.resolve('');
      }),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTechnicalDebtIndicators', () => {
    it('should return cached indicators when available', async () => {
      const cachedIndicators = {
        commentedOutCode: [],
        hugeCommits: [],
        wipCommits: [],
        quickFixCommits: [],
        largeBinaryFiles: [],
        vendoredCodeGrowth: [],
        longLivedBranches: [],
        branchProliferation: {
          totalBranches: 0,
          activeBranches: 0,
          mergedBranches: 0,
          unmergedBranches: 0,
          riskLevel: 'low' as const,
        },
        dependencyDrift: {
          lockfiles: [],
          dependencyBumps: [],
          staleDependencies: [],
        },
        missingAutomation: {
          hasDependencyAutomation: false,
          hasCicdAutomation: false,
          dependencyAutomationFiles: [],
          cicdAutomationFiles: [],
          riskLevel: 'high' as const,
        },
      };

      mockGetCachedTechnicalDebtIndicators.mockResolvedValue(cachedIndicators);

      const result = await getTechnicalDebtIndicators('/test/repo', true);

      expect(result).toEqual(cachedIndicators);
      expect(mockGetCachedTechnicalDebtIndicators).toHaveBeenCalledWith('/test/repo', 3600000);
      expect(mockSimpleGit).not.toHaveBeenCalled();
    });

    it('should throw error for non-git repository', async () => {
      // Suppress console.error for expected error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockGetCachedTechnicalDebtIndicators.mockResolvedValue(null);

      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(false),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      await expect(getTechnicalDebtIndicators('/test/repo', false)).rejects.toThrow(
        'Not a git repository'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should detect huge commits', async () => {
      mockGetCachedTechnicalDebtIndicators.mockResolvedValue(null);

      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);

      const mockGit = createMockGit({
        hugeCommits:
          `${hash1}|2024-01-01T10:00:00Z|John Doe|john@example.com|Large refactor\n` +
          '600\t300\tfile1.ts\n' +
          '400\t200\tfile2.ts\n' +
          `${hash2}|2024-01-02T11:00:00Z|Jane Doe|jane@example.com|Small change\n` +
          '10\t5\tfile3.ts\n',
      });

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      // Mock fs.existsSync to return false for all files
      mockFs.existsSync = vi.fn().mockReturnValue(false);
      mockFs.statSync = vi.fn().mockReturnValue({
        isFile: () => false,
        isDirectory: () => false,
        size: 0,
      });
      mockFs.readdirSync = vi.fn().mockReturnValue([]);

      // Mock path.join
      mockPath.join = vi.fn((...args) => args.join('/'));

      const result = await getTechnicalDebtIndicators('/test/repo', false);

      expect(result).toBeDefined();
      expect(result.hugeCommits.length).toBeGreaterThan(0);
      const hugeCommit = result.hugeCommits[0];
      expect(hugeCommit.commitHash).toBe(hash1);
      expect(hugeCommit.totalChanges).toBeGreaterThanOrEqual(500);
      expect(['low', 'medium', 'high']).toContain(hugeCommit.riskLevel);
    });

    it('should detect WIP commits', async () => {
      mockGetCachedTechnicalDebtIndicators.mockResolvedValue(null);

      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);

      const mockGit = createMockGit({
        wipCommits:
          `${hash1}|2024-01-01T10:00:00Z|John Doe|john@example.com|WIP: working on feature\n` +
          `${hash2}|2024-01-02T11:00:00Z|Jane Doe|jane@example.com|Normal commit\n`,
      });

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);
      mockFs.existsSync = vi.fn().mockReturnValue(false);
      mockFs.statSync = vi.fn().mockReturnValue({
        isFile: () => false,
        isDirectory: () => false,
        size: 0,
      });
      mockFs.readdirSync = vi.fn().mockReturnValue([]);
      mockPath.join = vi.fn((...args) => args.join('/'));

      const result = await getTechnicalDebtIndicators('/test/repo', false);

      expect(result.wipCommits.length).toBeGreaterThan(0);
      const wipCommit = result.wipCommits[0];
      expect(wipCommit.commitHash).toBe(hash1);
      expect(wipCommit.wipKeywords.length).toBeGreaterThan(0);
    });

    it('should detect quick fix commits', async () => {
      mockGetCachedTechnicalDebtIndicators.mockResolvedValue(null);

      const hash1 = 'a'.repeat(40);

      const mockGit = createMockGit({
        quickFixCommits: `${hash1}|2024-01-01T10:00:00Z|John Doe|john@example.com|quick fix: bug in login\n`,
      });

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);
      mockFs.existsSync = vi.fn().mockReturnValue(false);
      mockFs.statSync = vi.fn().mockReturnValue({
        isFile: () => false,
        isDirectory: () => false,
        size: 0,
      });
      mockFs.readdirSync = vi.fn().mockReturnValue([]);
      mockPath.join = vi.fn((...args) => args.join('/'));

      const result = await getTechnicalDebtIndicators('/test/repo', false);

      expect(result.quickFixCommits.length).toBeGreaterThan(0);
      const quickFix = result.quickFixCommits[0];
      expect(quickFix.commitHash).toBe(hash1);
      expect(quickFix.quickFixKeywords.length).toBeGreaterThan(0);
    });

    it('should detect large binary files', async () => {
      mockGetCachedTechnicalDebtIndicators.mockResolvedValue(null);

      const mockGit = createMockGit({
        lsFiles: 'large-file.jpg\n',
        lockfileLog: 'a'.repeat(40) + '|2024-01-01T10:00:00Z\n',
      });

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      // Mock file system operations
      mockFs.existsSync = vi.fn().mockReturnValue(true);
      mockFs.statSync = vi.fn().mockReturnValue({
        isFile: () => true,
        isDirectory: () => false,
        size: 2 * 1024 * 1024, // 2MB
      });
      mockFs.readdirSync = vi.fn().mockReturnValue([]);
      mockPath.join = vi.fn((...args) => args.join('/'));
      mockPath.extname = vi.fn((file) => {
        if (file.includes('.jpg')) return '.jpg';
        return '';
      });
      mockPath.basename = vi.fn((file) => file.split('/').pop() || file);

      const result = await getTechnicalDebtIndicators('/test/repo', false);

      expect(result.largeBinaryFiles.length).toBeGreaterThan(0);
      const binaryFile = result.largeBinaryFiles[0];
      expect(binaryFile.sizeBytes).toBeGreaterThanOrEqual(1024 * 1024);
      expect(['low', 'medium', 'high']).toContain(binaryFile.riskLevel);
    });

    it('should analyze branch proliferation', async () => {
      mockGetCachedTechnicalDebtIndicators.mockResolvedValue(null);

      const mockGit = createMockGit({
        forEachRef:
          'main|2024-01-01T10:00:00Z\n' +
          'feature-1|2024-01-01T10:00:00Z\n' +
          'feature-2|2024-01-02T11:00:00Z\n' +
          'feature-3|2024-01-03T12:00:00Z\n',
        branchMerged: 'feature-1\nfeature-2\n',
      });

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);
      mockFs.existsSync = vi.fn().mockReturnValue(false);
      mockFs.statSync = vi.fn().mockReturnValue({
        isFile: () => false,
        isDirectory: () => false,
        size: 0,
      });
      mockFs.readdirSync = vi.fn().mockReturnValue([]);
      mockPath.join = vi.fn((...args) => args.join('/'));

      const result = await getTechnicalDebtIndicators('/test/repo', false);

      expect(result.branchProliferation).toBeDefined();
      expect(result.branchProliferation.totalBranches).toBeGreaterThan(0);
      expect(['low', 'medium', 'high']).toContain(result.branchProliferation.riskLevel);
    });

    it('should analyze dependency drift', async () => {
      mockGetCachedTechnicalDebtIndicators.mockResolvedValue(null);

      const hash1 = 'a'.repeat(40);
      const now = new Date();
      const oldDate = new Date(now);
      oldDate.setDate(oldDate.getDate() - 200); // 200 days ago

      const mockGit = createMockGit({
        lsFiles: 'package-lock.json\n',
        lockfileLog: `${hash1}|${oldDate.toISOString()}\n`,
      });

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);
      mockFs.existsSync = vi.fn().mockReturnValue(false);
      mockFs.statSync = vi.fn().mockReturnValue({
        isFile: () => false,
        isDirectory: () => false,
        size: 0,
      });
      mockFs.readdirSync = vi.fn().mockReturnValue([]);
      mockPath.join = vi.fn((...args) => args.join('/'));
      mockPath.basename = vi.fn((file) => file.split('/').pop() || file);

      const result = await getTechnicalDebtIndicators('/test/repo', false);

      expect(result.dependencyDrift).toBeDefined();
      expect(result.dependencyDrift.lockfiles.length).toBeGreaterThan(0);
      expect(result.dependencyDrift.staleDependencies.length).toBeGreaterThan(0);
    });

    it('should detect missing automation', async () => {
      mockGetCachedTechnicalDebtIndicators.mockResolvedValue(null);

      const mockGit = createMockGit();

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      // Mock file system - no automation files exist
      mockFs.existsSync = vi.fn().mockReturnValue(false);
      mockFs.statSync = vi.fn().mockReturnValue({
        isFile: () => false,
        isDirectory: () => false,
        size: 0,
      });
      mockFs.readdirSync = vi.fn().mockReturnValue([]);
      mockPath.join = vi.fn((...args) => args.join('/'));

      const result = await getTechnicalDebtIndicators('/test/repo', false);

      expect(result.missingAutomation).toBeDefined();
      expect(result.missingAutomation.hasDependencyAutomation).toBe(false);
      expect(result.missingAutomation.hasCicdAutomation).toBe(false);
      expect(result.missingAutomation.riskLevel).toBe('high');
    });

    it('should detect automation files when present', async () => {
      mockGetCachedTechnicalDebtIndicators.mockResolvedValue(null);

      const mockGit = createMockGit();

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      // Mock file system - automation files exist
      mockFs.existsSync = vi.fn((filePath: string) => {
        return (
          filePath.includes('.github/dependabot.yml') || filePath.includes('.github/workflows')
        );
      });
      mockFs.statSync = vi.fn((filePath: string) => {
        if (filePath.includes('workflows')) {
          return { isDirectory: () => true, isFile: () => false, size: 0 };
        }
        return { isFile: () => true, isDirectory: () => false, size: 0 };
      });
      mockFs.readdirSync = vi.fn((dirPath: string) => {
        if (dirPath.includes('workflows')) {
          return ['ci.yml', 'deploy.yml'];
        }
        return [];
      });
      mockPath.join = vi.fn((...args) => args.join('/'));

      const result = await getTechnicalDebtIndicators('/test/repo', false);

      expect(result.missingAutomation).toBeDefined();
      expect(result.missingAutomation.hasDependencyAutomation).toBe(true);
      expect(result.missingAutomation.hasCicdAutomation).toBe(true);
      expect(result.missingAutomation.riskLevel).toBe('low');
    });

    it('should call progress callback during analysis', async () => {
      mockGetCachedTechnicalDebtIndicators.mockResolvedValue(null);

      const mockGit = createMockGit();

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);
      mockFs.existsSync = vi.fn().mockReturnValue(false);
      mockFs.statSync = vi.fn().mockReturnValue({
        isFile: () => false,
        isDirectory: () => false,
        size: 0,
      });
      mockFs.readdirSync = vi.fn().mockReturnValue([]);
      mockPath.join = vi.fn((...args) => args.join('/'));

      const progressCallback = vi.fn();

      await getTechnicalDebtIndicators('/test/repo', false, progressCallback);

      expect(progressCallback).toHaveBeenCalled();
      // Should be called with progress values
      const calls = progressCallback.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      // Last call should be 100%
      expect(calls[calls.length - 1][0]).toBe(100);
    });

    it('should cache results after calculation', async () => {
      mockGetCachedTechnicalDebtIndicators.mockResolvedValue(null);
      mockSetCachedTechnicalDebtIndicators.mockResolvedValue(undefined);

      const mockGit = createMockGit();

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);
      mockFs.existsSync = vi.fn().mockReturnValue(false);
      mockFs.statSync = vi.fn().mockReturnValue({
        isFile: () => false,
        isDirectory: () => false,
        size: 0,
      });
      mockFs.readdirSync = vi.fn().mockReturnValue([]);
      mockPath.join = vi.fn((...args) => args.join('/'));

      await getTechnicalDebtIndicators('/test/repo', true);

      expect(mockSetCachedTechnicalDebtIndicators).toHaveBeenCalledWith(
        '/test/repo',
        expect.any(Object)
      );
    });

    it('should handle errors gracefully in individual detection functions', async () => {
      mockGetCachedTechnicalDebtIndicators.mockResolvedValue(null);

      // Create a custom mock that rejects for commented code but works for others
      const mockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        raw: vi.fn().mockImplementation((args: string[]) => {
          const argsStr = args.join(' ');
          if (argsStr.includes('-100')) {
            // commented-out code - reject
            return Promise.reject(new Error('Error in commented code detection'));
          }
          // Use the helper for other calls
          const helperGit = createMockGit();
          return helperGit.raw(args);
        }),
      };

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);
      mockFs.existsSync = vi.fn().mockReturnValue(false);
      mockFs.statSync = vi.fn().mockReturnValue({
        isFile: () => false,
        isDirectory: () => false,
        size: 0,
      });
      mockFs.readdirSync = vi.fn().mockReturnValue([]);
      mockPath.join = vi.fn((...args) => args.join('/'));

      // Should not throw, but return empty array for failed detection
      const result = await getTechnicalDebtIndicators('/test/repo', false);

      expect(result).toBeDefined();
      expect(result.commentedOutCode).toEqual([]);
    });
  });

  describe('getCrossRepoTechnicalDebtIndicators', () => {
    it('should return empty result when no repositories', async () => {
      mockGetRepositories.mockResolvedValue([]);

      const result = await getCrossRepoTechnicalDebtIndicators('project-1', false);

      expect(result.repositories).toEqual([]);
      expect(result.aggregated.totalCommentedOutCode).toBe(0);
      expect(result.aggregated.totalHugeCommits).toBe(0);
      expect(result.totalRepos).toBe(0);
      expect(result.repoNames).toEqual([]);
    });

    it('should aggregate indicators across repositories', async () => {
      // Mock repositories
      mockGetRepositories.mockResolvedValue([
        { id: 'repo1', name: 'Repo 1', path: '/repo1', projectId: 'project-1' },
        { id: 'repo2', name: 'Repo 2', path: '/repo2', projectId: 'project-1' },
      ]);

      // Mock git for each repo
      const mockGit = createMockGit();

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);
      mockFs.existsSync = vi.fn().mockReturnValue(false);
      mockFs.statSync = vi.fn().mockReturnValue({
        isFile: () => false,
        isDirectory: () => false,
        size: 0,
      });
      mockFs.readdirSync = vi.fn().mockReturnValue([]);
      mockPath.join = vi.fn((...args) => args.join('/'));
      mockPath.basename = vi.fn((file) => file.split('/').pop() || file);

      const result = await getCrossRepoTechnicalDebtIndicators('project-1', false);

      expect(result.totalRepos).toBe(2);
      expect(result.repoNames.length).toBe(2);
      expect(result.repositories.length).toBe(2);
      expect(result.aggregated).toBeDefined();
    });

    it('should handle errors for individual repositories gracefully', async () => {
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
          return createMockGit();
        } else {
          return {
            checkIsRepo: vi.fn().mockResolvedValue(false),
            raw: vi.fn(),
          };
        }
      };

      vi.mocked(simpleGit).mockImplementation(mockGitFactory as any);
      mockFs.existsSync = vi.fn().mockReturnValue(false);
      mockFs.statSync = vi.fn().mockReturnValue({
        isFile: () => false,
        isDirectory: () => false,
        size: 0,
      });
      mockFs.readdirSync = vi.fn().mockReturnValue([]);
      mockPath.join = vi.fn((...args) => args.join('/'));
      mockPath.basename = vi.fn((file) => file.split('/').pop() || file);

      const result = await getCrossRepoTechnicalDebtIndicators('project-1', false);

      // Should still process the first repo successfully
      expect(result.totalRepos).toBe(1);
      expect(result.repositories.length).toBe(1);

      consoleErrorSpy.mockRestore();
    });

    it('should calculate aggregated metrics correctly', async () => {
      mockGetRepositories.mockResolvedValue([
        { id: 'repo1', name: 'Repo 1', path: '/repo1', projectId: 'project-1' },
      ]);

      const hash1 = 'a'.repeat(40);
      const hash2 = 'b'.repeat(40);

      const mockGit = createMockGit({
        hugeCommits:
          `${hash1}|2024-01-01T10:00:00Z|John Doe|john@example.com|Large change\n` +
          '600\t300\tfile1.ts\n' +
          `${hash2}|2024-01-02T11:00:00Z|Jane Doe|jane@example.com|Another large change\n` +
          '500\t250\tfile2.ts\n',
        wipCommits: `${hash1}|2024-01-01T10:00:00Z|John Doe|john@example.com|WIP: feature\n`,
        quickFixCommits: `${hash2}|2024-01-02T11:00:00Z|Jane Doe|jane@example.com|quick fix: bug\n`,
      });

      vi.mocked(simpleGit).mockReturnValue(mockGit as any);
      mockFs.existsSync = vi.fn().mockReturnValue(false);
      mockFs.statSync = vi.fn().mockReturnValue({
        isFile: () => false,
        isDirectory: () => false,
        size: 0,
      });
      mockFs.readdirSync = vi.fn().mockReturnValue([]);
      mockPath.join = vi.fn((...args) => args.join('/'));
      mockPath.basename = vi.fn((file) => file.split('/').pop() || file);

      const result = await getCrossRepoTechnicalDebtIndicators('project-1', false);

      expect(result.aggregated.totalHugeCommits).toBe(2);
      expect(result.aggregated.totalWipCommits).toBe(1);
      expect(result.aggregated.totalQuickFixCommits).toBe(1);
    });
  });
});
