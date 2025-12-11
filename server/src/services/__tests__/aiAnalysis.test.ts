import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { generateInsights } from '../aiAnalysis';
import * as ollamaService from '../ollama';
import type { OllamaSettings } from '../../db/types';
import type {
  CodebaseHealth,
  DeveloperAnalytics,
  RepositoryEvolution,
  BusFactorAndOwnership,
  SocialNetworkAnalysis,
} from '../../git/types';

// Mock the ollama service module
vi.mock('../ollama', () => ({
  generateCompletion: vi.fn(),
}));

const mockGenerateCompletion = vi.mocked(ollamaService.generateCompletion);

describe('aiAnalysis service', () => {
  const defaultSettings: OllamaSettings = {
    enabled: true,
    host: 'localhost',
    port: 11434,
    model: 'llama3',
    timeout: 30000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateCompletion.mockResolvedValue('Test AI insights response');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateInsights', () => {
    it('should throw error when Ollama is not enabled', async () => {
      const disabledSettings: OllamaSettings = {
        ...defaultSettings,
        enabled: false,
      };

      await expect(
        generateInsights('codebase-health', {} as CodebaseHealth, disabledSettings)
      ).rejects.toThrow('Ollama is not enabled');
    });

    it('should generate insights for codebase-health', async () => {
      const data: CodebaseHealth = {
        hotspots: {
          files: [{ file: 'src/main.ts', commits: 100 }],
          directories: [{ directory: 'src/', commits: 200 }],
        },
        changeCoupling: {
          pairs: [
            {
              file1: 'src/file1.ts',
              file2: 'src/file2.ts',
              coChanges: 10,
              coChangePercentage: 50,
            },
          ],
        },
        stability: {
          files: [
            {
              file: 'src/unstable.ts',
              ageDays: 10,
              changeFrequency: 5,
              status: 'unstable',
            },
          ],
        },
        complexity: {
          averageDiffSizes: [{ file: 'src/complex.ts', averageDiffSize: 500 }],
          largestDiffs: [],
          mostRewritten: [],
        },
        hygiene: {
          branchCount: 5,
          unmergedBranchCount: 2,
          oldestUnmergedBranchDays: 30,
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

      const result = await generateInsights('codebase-health', data, defaultSettings);

      expect(result).toBe('Test AI insights response');
      expect(mockGenerateCompletion).toHaveBeenCalledOnce();
      const prompt = mockGenerateCompletion.mock.calls[0][0];
      expect(prompt.toLowerCase()).toContain('codebase');
      expect(prompt).toContain('HOTSPOTS');
      expect(prompt).toContain('src/main.ts');
    });

    it('should generate insights for developer-analytics', async () => {
      const data: DeveloperAnalytics = {
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
              hourOfDay: { 9: 20, 14: 15 },
              dayOfWeek: { 1: 30, 2: 25 },
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
      };

      const result = await generateInsights('developer-analytics', data, defaultSettings);

      expect(result).toBe('Test AI insights response');
      expect(mockGenerateCompletion).toHaveBeenCalledOnce();
      const prompt = mockGenerateCompletion.mock.calls[0][0];
      expect(prompt.toLowerCase()).toContain('developer');
      expect(prompt).toContain('John Doe');
    });

    it('should handle empty activeTimeWindows gracefully in developer-analytics', async () => {
      const data: DeveloperAnalytics = {
        authors: [
          {
            name: 'Jane Smith',
            email: 'jane@example.com',
            commits: 50,
            linesAdded: 2000,
            linesRemoved: 500,
            netLines: 1500,
            firstCommit: '2024-01-01',
            lastCommit: '2024-12-01',
            percentage: '25%',
            activeTimeWindows: {
              hourOfDay: {}, // Empty object
              dayOfWeek: {}, // Empty object
            },
            signedCommits: 40,
            signedCommitsPercentage: '80%',
            fixCommits: 5,
            fixCommitRatio: '10%',
            revertCommits: 1,
            revertCommitRatio: '2%',
            churn: 500,
            churnRatio: '20%',
          },
        ],
      };

      const result = await generateInsights('developer-analytics', data, defaultSettings);

      expect(result).toBe('Test AI insights response');
      expect(mockGenerateCompletion).toHaveBeenCalledOnce();
      const prompt = mockGenerateCompletion.mock.calls[0][0];
      expect(prompt).toContain('Jane Smith');
      expect(prompt).toContain('No activity patterns recorded');
    });

    it('should handle partially empty activeTimeWindows gracefully', async () => {
      const data: DeveloperAnalytics = {
        authors: [
          {
            name: 'Bob Johnson',
            email: 'bob@example.com',
            commits: 75,
            linesAdded: 3000,
            linesRemoved: 1000,
            netLines: 2000,
            firstCommit: '2024-01-01',
            lastCommit: '2024-12-01',
            percentage: '37.5%',
            activeTimeWindows: {
              hourOfDay: { 9: 10 }, // Has data
              dayOfWeek: {}, // Empty object
            },
            signedCommits: 60,
            signedCommitsPercentage: '80%',
            fixCommits: 7,
            fixCommitRatio: '9.3%',
            revertCommits: 1,
            revertCommitRatio: '1.3%',
            churn: 1000,
            churnRatio: '25%',
          },
        ],
      };

      const result = await generateInsights('developer-analytics', data, defaultSettings);

      expect(result).toBe('Test AI insights response');
      expect(mockGenerateCompletion).toHaveBeenCalledOnce();
      const prompt = mockGenerateCompletion.mock.calls[0][0];
      expect(prompt).toContain('Bob Johnson');
      expect(prompt).toContain('Peak hour 9:00');
      expect(prompt).toContain('Peak day N/A');
    });

    it('should generate insights for repository-evolution', async () => {
      const data: RepositoryEvolution = {
        commitFrequency: [
          { date: '2024-01-01', commits: 10 },
          { date: '2024-01-02', commits: 5 },
        ],
        releases: [
          {
            tag: 'v1.0.0',
            date: '2024-01-15',
            commitHash: 'abc123',
            message: 'Initial release',
          },
        ],
        growthCurve: [
          { date: '2024-01-01', loc: 1000, files: 10 },
          { date: '2024-01-02', loc: 1100, files: 11 },
        ],
        changeBursts: [
          {
            date: '2024-01-10',
            commits: 50,
            linesAdded: 5000,
            linesRemoved: 1000,
            netChange: 4000,
            isRefactor: false,
          },
        ],
        churnMetrics: [
          {
            date: '2024-01-01',
            additions: 1000,
            deletions: 200,
            netChange: 800,
            churnRatio: 20,
          },
        ],
        totalCommits: 100,
        totalReleases: 1,
        averageCommitsPerDay: 2.5,
        averageChurnRatio: 20,
        refactorCount: 5,
      };

      const result = await generateInsights('repository-evolution', data, defaultSettings);

      expect(result).toBe('Test AI insights response');
      expect(mockGenerateCompletion).toHaveBeenCalledOnce();
      const prompt = mockGenerateCompletion.mock.calls[0][0];
      expect(prompt.toLowerCase()).toContain('evolution');
      expect(prompt).toContain('v1.0.0');
    });

    it('should generate insights for bus-factor', async () => {
      const data: BusFactorAndOwnership = {
        singleMaintainerRisk: {
          files: [
            {
              file: 'src/critical.ts',
              primaryAuthor: 'John Doe',
              primaryAuthorEmail: 'john@example.com',
              primaryAuthorCommits: 90,
              totalCommits: 100,
              ownershipPercentage: 90,
              riskLevel: 'high',
            },
          ],
        },
        fragmentation: {
          files: [
            {
              file: 'src/fragmented.ts',
              authorCount: 20,
              totalCommits: 100,
              averageCommitsPerAuthor: 5,
              riskLevel: 'medium',
            },
          ],
        },
        ownerChurn: {
          files: [
            {
              file: 'src/churned.ts',
              previousOwner: 'Alice',
              previousOwnerEmail: 'alice@example.com',
              previousOwnerLastCommit: '2024-01-01',
              currentOwner: 'Bob',
              currentOwnerEmail: 'bob@example.com',
              currentOwnerFirstCommit: '2024-06-01',
              daysSinceTransition: 150,
              riskLevel: 'medium',
            },
          ],
        },
      };

      const result = await generateInsights('bus-factor', data, defaultSettings);

      expect(result).toBe('Test AI insights response');
      expect(mockGenerateCompletion).toHaveBeenCalledOnce();
      const prompt = mockGenerateCompletion.mock.calls[0][0];
      expect(prompt.toLowerCase()).toContain('bus factor');
      expect(prompt).toContain('John Doe');
      expect(prompt).toContain('src/critical.ts');
    });

    it('should generate insights for social-network', async () => {
      const data: SocialNetworkAnalysis = {
        collaborationGraph: {
          nodes: [
            {
              author: 'John Doe',
              authorEmail: 'john@example.com',
              degree: 3,
              totalSharedFiles: 10,
            },
          ],
          edges: [
            {
              author1: 'John Doe',
              author1Email: 'john@example.com',
              author2: 'Jane Smith',
              author2Email: 'jane@example.com',
              sharedFiles: 5,
              sharedFilesList: ['file1.ts', 'file2.ts'],
              collaborationStrength: 0.8,
            },
          ],
        },
        knowledgeSilos: [
          {
            file: 'src/silo.ts',
            authorCount: 1,
            authors: ['John Doe'],
            authorEmails: ['john@example.com'],
            totalCommits: 50,
            lastCommitDate: '2024-01-01',
            daysSinceLastCommit: 30,
            riskLevel: 'high',
          },
        ],
        orphanedCode: [
          {
            file: 'src/orphaned.ts',
            lastCommitDate: '2023-01-01',
            daysSinceLastCommit: 365,
            lastAuthor: 'John Doe',
            lastAuthorEmail: 'john@example.com',
            totalCommits: 10,
            riskLevel: 'medium',
          },
        ],
      };

      const result = await generateInsights('social-network', data, defaultSettings);

      expect(result).toBe('Test AI insights response');
      expect(mockGenerateCompletion).toHaveBeenCalledOnce();
      const prompt = mockGenerateCompletion.mock.calls[0][0];
      expect(prompt.toLowerCase()).toContain('social network');
      expect(prompt).toContain('John Doe');
    });

    it('should generate insights for code-quality', async () => {
      const data: CodebaseHealth = {
        hotspots: {
          files: [{ file: 'src/main.ts', commits: 100 }],
          directories: [],
        },
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

      const result = await generateInsights('code-quality', data, defaultSettings);

      expect(result).toBe('Test AI insights response');
      expect(mockGenerateCompletion).toHaveBeenCalledOnce();
      const prompt = mockGenerateCompletion.mock.calls[0][0];
      expect(prompt.toLowerCase()).toContain('quality');
    });

    it('should generate insights for contributor-behavior', async () => {
      const data: DeveloperAnalytics = {
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
      };

      const result = await generateInsights('contributor-behavior', data, defaultSettings);

      expect(result).toBe('Test AI insights response');
      expect(mockGenerateCompletion).toHaveBeenCalledOnce();
      const prompt = mockGenerateCompletion.mock.calls[0][0];
      expect(prompt.toLowerCase()).toContain('contributor');
    });

    it('should generate insights for risk-assessment', async () => {
      const data: BusFactorAndOwnership = {
        singleMaintainerRisk: {
          files: [
            {
              file: 'src/critical.ts',
              primaryAuthor: 'John Doe',
              primaryAuthorEmail: 'john@example.com',
              primaryAuthorCommits: 90,
              totalCommits: 100,
              ownershipPercentage: 90,
              riskLevel: 'high',
            },
          ],
        },
        fragmentation: { files: [] },
        ownerChurn: { files: [] },
      };

      const result = await generateInsights('risk-assessment', data, defaultSettings);

      expect(result).toBe('Test AI insights response');
      expect(mockGenerateCompletion).toHaveBeenCalledOnce();
      const prompt = mockGenerateCompletion.mock.calls[0][0];
      expect(prompt.toLowerCase()).toContain('risk');
    });

    it('should generate insights for commit-messages', async () => {
      const data = {
        summary: {
          totalCommits: 1000,
          totalAuthors: 10,
          totalFiles: 100,
        },
        authors: [
          {
            name: 'John Doe',
            commits: 500,
            percentage: '50%',
          },
        ],
        activity: {
          hourOfDay: {
            9: 100,
            14: 80,
          },
        },
      };

      const result = await generateInsights('commit-messages', data, defaultSettings);

      expect(result).toBe('Test AI insights response');
      expect(mockGenerateCompletion).toHaveBeenCalledOnce();
      const prompt = mockGenerateCompletion.mock.calls[0][0];
      expect(prompt.toLowerCase()).toContain('commit');
      expect(prompt).toContain('John Doe');
    });

    it('should generate insights for technical-debt', async () => {
      const data: CodebaseHealth = {
        hotspots: {
          files: [{ file: 'src/debt.ts', commits: 200 }],
          directories: [],
        },
        changeCoupling: { pairs: [] },
        stability: {
          files: [
            {
              file: 'src/unstable.ts',
              ageDays: 5,
              changeFrequency: 10,
              status: 'unstable',
            },
          ],
        },
        complexity: {
          averageDiffSizes: [{ file: 'src/complex.ts', averageDiffSize: 1000 }],
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

      const result = await generateInsights('technical-debt', data, defaultSettings);

      expect(result).toBe('Test AI insights response');
      expect(mockGenerateCompletion).toHaveBeenCalledOnce();
      const prompt = mockGenerateCompletion.mock.calls[0][0];
      expect(prompt.toLowerCase()).toContain('debt');
    });

    it('should handle errors from generateCompletion', async () => {
      mockGenerateCompletion.mockRejectedValue(new Error('Ollama connection failed'));

      const data: CodebaseHealth = {
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

      await expect(generateInsights('codebase-health', data, defaultSettings)).rejects.toThrow(
        'Ollama connection failed'
      );
    });

    it('should format prompts with actual data values', async () => {
      const data: CodebaseHealth = {
        hotspots: {
          files: [
            { file: 'src/file1.ts', commits: 50 },
            { file: 'src/file2.ts', commits: 30 },
          ],
          directories: [{ directory: 'src/utils/', commits: 80 }],
        },
        changeCoupling: {
          pairs: [
            {
              file1: 'src/a.ts',
              file2: 'src/b.ts',
              coChanges: 15,
              coChangePercentage: 75.5,
            },
          ],
        },
        stability: {
          files: [
            {
              file: 'src/unstable.ts',
              ageDays: 7,
              changeFrequency: 8,
              status: 'unstable',
            },
          ],
        },
        complexity: {
          averageDiffSizes: [{ file: 'src/complex.ts', averageDiffSize: 250 }],
          largestDiffs: [],
          mostRewritten: [],
        },
        hygiene: {
          branchCount: 3,
          unmergedBranchCount: 1,
          oldestUnmergedBranchDays: 45,
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

      await generateInsights('codebase-health', data, defaultSettings);

      const prompt = mockGenerateCompletion.mock.calls[0][0];
      expect(prompt).toContain('src/file1.ts');
      expect(prompt).toContain('50 commits');
      expect(prompt).toContain('src/utils/');
      expect(prompt).toContain('75.5%');
      expect(prompt).toContain('8 changes');
      expect(prompt).toContain('250 lines');
      expect(prompt).toContain('3');
      expect(prompt).toContain('45 days');
    });

    it('should limit data in prompts to prevent excessive length', async () => {
      const data: CodebaseHealth = {
        hotspots: {
          files: Array.from({ length: 50 }, (_, i) => ({
            file: `src/file${i}.ts`,
            commits: 10 + i,
          })),
          directories: [],
        },
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

      await generateInsights('codebase-health', data, defaultSettings);

      const prompt = mockGenerateCompletion.mock.calls[0][0];
      // Should only include top 10 files
      const fileCount = (prompt.match(/src\/file\d+\.ts/g) || []).length;
      expect(fileCount).toBeLessThanOrEqual(10);
    });
  });
});
