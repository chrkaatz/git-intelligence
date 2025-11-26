import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import * as api from '../../api';
import { NotificationProvider } from '../../context/NotificationContext';

vi.mock('@tanstack/react-router', () => ({
  useParams: vi.fn(),
}));

import { useParams } from '@tanstack/react-router';
import { CrossRepoAnalyticsPortfolioView } from '../crossRepo/CrossRepoAnalyticsPortfolioView';

describe('CrossRepoAnalyticsPortfolioView', () => {
  const getCrossRepoDeveloperAnalyticsSpy = vi.spyOn(api, 'getCrossRepoDeveloperAnalytics');
  const getCrossRepoRepositoryEvolutionSpy = vi.spyOn(api, 'getCrossRepoRepositoryEvolution');
  const getCrossRepoCodebaseHealthSpy = vi.spyOn(api, 'getCrossRepoCodebaseHealth');
  const getCrossRepoBusFactorAndOwnershipSpy = vi.spyOn(api, 'getCrossRepoBusFactorAndOwnership');
  const getCrossRepoSocialNetworkAnalysisSpy = vi.spyOn(api, 'getCrossRepoSocialNetworkAnalysis');

  const mockDevAnalytics: api.CrossRepoDeveloperAnalytics = {
    totalRepos: 2,
    repoNames: ['repo-a', 'repo-b'],
    authors: [
      {
        name: 'Dev One',
        email: 'one@example.com',
        commits: 100,
        linesAdded: 500,
        linesRemoved: 100,
        netLines: 400,
        firstCommit: '2024-01-01',
        lastCommit: '2024-02-01',
        percentage: '50.0',
        activeTimeWindows: {
          hourOfDay: {},
          dayOfWeek: {},
        },
        signedCommits: 0,
        signedCommitsPercentage: '0.0',
        fixCommits: 5,
        fixCommitRatio: '5.0',
        revertCommits: 1,
        revertCommitRatio: '1.0',
        churn: 50,
        churnRatio: '10.0',
        repoSpread: [
          {
            repoName: 'repo-a',
            repoPath: '/path/to/repo-a',
            commits: 60,
            linesAdded: 300,
            linesRemoved: 50,
          },
        ],
        repoCount: 1,
      },
    ],
  };

  const mockEvolution: api.CrossRepoRepositoryEvolution = {
    repositories: [
      {
        repoName: 'repo-a',
        repoPath: '/path/to/repo-a',
        evolution: {
          commitFrequency: [
            { date: '2024-01-01', commits: 5 },
            { date: '2024-01-02', commits: 10 },
          ],
          releases: [],
          growthCurve: [],
          changeBursts: [],
          churnMetrics: [],
          totalCommits: 15,
          totalReleases: 0,
          averageCommitsPerDay: 7.5,
          averageChurnRatio: 1.2,
          refactorCount: 0,
        },
      },
      {
        repoName: 'repo-b',
        repoPath: '/path/to/repo-b',
        evolution: {
          commitFrequency: [{ date: '2024-01-01', commits: 3 }],
          releases: [],
          growthCurve: [],
          changeBursts: [],
          churnMetrics: [],
          totalCommits: 3,
          totalReleases: 0,
          averageCommitsPerDay: 3,
          averageChurnRatio: 0.5,
          refactorCount: 0,
        },
      },
    ],
    synchronization: [
      {
        date: '2024-01-01',
        repos: ['repo-a', 'repo-b'],
        commitCounts: {
          'repo-a': 5,
          'repo-b': 3,
        },
      },
    ],
    totalRepos: 2,
    repoNames: ['repo-a', 'repo-b'],
  };

  const mockHealth: api.CrossRepoCodebaseHealth = {
    hotspots: {
      repositories: [],
      aggregatedFiles: [],
      aggregatedDirectories: [],
    },
    totalRepos: 2,
    repoNames: ['repo-a', 'repo-b'],
  };

  const mockBusFactor: api.CrossRepoBusFactorAndOwnership = {
    singleMaintainerRisk: {
      repositories: [],
      aggregatedFiles: [],
    },
    fragmentation: {
      repositories: [],
      aggregatedFiles: [],
    },
    ownerChurn: {
      repositories: [],
      aggregatedFiles: [],
    },
    totalRepos: 2,
    repoNames: ['repo-a', 'repo-b'],
  };

  const mockSocial: api.CrossRepoSocialNetworkAnalysis = {
    crossRepoCollaboration: [],
    repoClusters: [],
    totalRepos: 2,
    repoNames: ['repo-a', 'repo-b'],
  };

  beforeEach(() => {
    getCrossRepoDeveloperAnalyticsSpy.mockResolvedValue(mockDevAnalytics);
    getCrossRepoRepositoryEvolutionSpy.mockResolvedValue(mockEvolution);
    getCrossRepoCodebaseHealthSpy.mockResolvedValue(mockHealth);
    getCrossRepoBusFactorAndOwnershipSpy.mockResolvedValue(mockBusFactor);
    getCrossRepoSocialNetworkAnalysisSpy.mockResolvedValue(mockSocial);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders portfolio-level view heading and summary cards after loading', async () => {
    (useParams as unknown as vi.Mock).mockReturnValue({ projectId: 'test-project-id' });

    await waitFor(() => {
      render(
        <NotificationProvider>
          <CrossRepoAnalyticsPortfolioView />
        </NotificationProvider>
      );
    });

    // Title
    expect(screen.getByText('Cross-Repository Portfolio Analytics')).toBeInTheDocument();

    // Wait for async data to be rendered
    await waitFor(() => {
      expect(screen.getByText('Portfolio-Level View')).toBeInTheDocument();
    });

    // Summary values
    expect(screen.getByText('Repositories')).toBeInTheDocument();
    expect(screen.getByText('Developers')).toBeInTheDocument();
    expect(screen.getByText('Total Commits')).toBeInTheDocument();

    // Total repos from mock
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows fallback message when no projectId is present', async () => {
    (useParams as unknown as vi.Mock).mockReturnValue({});

    render(
      <NotificationProvider>
        <CrossRepoAnalyticsPortfolioView />
      </NotificationProvider>
    );

    expect(
      screen.getByText('Select a project to view cross-repository portfolio analytics.')
    ).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    (useParams as unknown as vi.Mock).mockReturnValue({ projectId: 'test-project-id' });
    const errorSpy = getCrossRepoDeveloperAnalyticsSpy.mockRejectedValueOnce(
      new Error('Failed to load')
    );

    await waitFor(() => {
      render(
        <NotificationProvider>
          <CrossRepoAnalyticsPortfolioView />
        </NotificationProvider>
      );
    });

    await waitFor(() => {
      const errors = screen.getAllByText(/Failed to load/i);
      expect(errors.length).toBeGreaterThan(0);
    });

    expect(errorSpy).toHaveBeenCalled();
  });
});
