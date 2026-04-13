import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getReadinessDiagnostics } from '../readinessDiagnostics';
import simpleGit from 'simple-git';
import { getCachedReadinessDiagnostics, setCachedReadinessDiagnostics } from '../../db/cache';
import {
  clearCachedAIInsights,
  getCachedAIInsights,
  getOllamaSettings,
  setCachedAIInsights,
} from '../../db';

vi.mock('simple-git');
vi.mock('../../db/cache', () => ({
  getCachedReadinessDiagnostics: vi.fn(),
  setCachedReadinessDiagnostics: vi.fn(),
}));
vi.mock('../../db', () => ({
  clearCachedAIInsights: vi.fn(),
  getCachedAIInsights: vi.fn(),
  setCachedAIInsights: vi.fn(),
  getOllamaSettings: vi.fn().mockResolvedValue({
    enabled: false,
    host: 'localhost',
    port: 11434,
    model: 'llama3',
    timeout: 120000,
  }),
}));

const mockGetCached = vi.mocked(getCachedReadinessDiagnostics);
const mockSetCached = vi.mocked(setCachedReadinessDiagnostics);
const mockClearCachedAIInsights = vi.mocked(clearCachedAIInsights);
const mockGetCachedAIInsights = vi.mocked(getCachedAIInsights);
const mockSetCachedAIInsights = vi.mocked(setCachedAIInsights);
const mockGetOllamaSettings = vi.mocked(getOllamaSettings);

describe('readinessDiagnostics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCached.mockResolvedValue(null);
    mockSetCached.mockResolvedValue(undefined);
    mockClearCachedAIInsights.mockResolvedValue(undefined);
    mockGetCachedAIInsights.mockResolvedValue(null);
    mockSetCachedAIInsights.mockResolvedValue(undefined);
    mockGetOllamaSettings.mockResolvedValue({
      enabled: false,
      host: 'localhost',
      port: 11434,
      model: 'llama3',
      timeout: 120000,
    });
  });

  it('should throw when not a git repository', async () => {
    const mockGit = {
      checkIsRepo: vi.fn().mockResolvedValue(false),
    };
    vi.mocked(simpleGit).mockReturnValue(mockGit as any);

    await expect(getReadinessDiagnostics('/bad', false)).rejects.toThrow('Not a git repository');
  });

  it('should compute diagnostics from git raw output', async () => {
    const mockGit = {
      checkIsRepo: vi.fn().mockResolvedValue(true),
      raw: vi
        .fn()
        .mockResolvedValueOnce('src/a.ts\n\nsrc/b.ts\n\nsrc/a.ts\n\n')
        .mockResolvedValueOnce('src/a.ts\n\n')
        .mockResolvedValueOnce(
          '2024-01-01T10:00:00+00:00|Alice Doe\n2024-02-01T10:00:00+00:00|Bob\n2024-02-15T10:00:00+00:00|Alice Doe\n'
        )
        .mockResolvedValueOnce(
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa|2024-06-01T12:00:00+00:00|hotfix pipeline\n'
        ),
    };
    vi.mocked(simpleGit).mockReturnValue(mockGit as any);

    const result = await getReadinessDiagnostics('/repo', false);

    expect(result.topChurnFiles[0].path).toBe('src/a.ts');
    expect(result.topChurnFiles[0].touches).toBe(2);
    expect(result.bugFixTouchFiles[0].path).toBe('src/a.ts');
    expect(result.highRiskOverlap).toContain('src/a.ts');
    expect(result.contributorsAllTime[0].name).toBe('Alice Doe');
    expect(result.topContributorInactiveRecently).toBe(true);
    expect(result.commitsByMonth.find((m) => m.month === '2024-02')?.count).toBe(2);
    expect(result.firefightingCommits).toHaveLength(1);
    expect(result.firefightingCommits[0].subject).toContain('hotfix');

    expect(mockSetCached).not.toHaveBeenCalled();
  });
});
