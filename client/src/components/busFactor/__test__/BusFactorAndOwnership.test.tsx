import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BusFactorAndOwnership } from '../BusFactorAndOwnership';
import type { BusFactorAndOwnership as BusFactorAndOwnershipType } from '../../../api';

const makeMockAnalytics = (): BusFactorAndOwnershipType => ({
  singleMaintainerRisk: {
    repoRisk: {
      riskLevel: 'high',
      primaryAuthor: 'Alice',
      primaryAuthorEmail: 'alice@example.com',
      ownershipPercentage: 80,
      primaryAuthorCommits: 80,
      totalCommits: 100,
    },
    files: [
      {
        file: 'src/file1.ts',
        primaryAuthor: 'Alice',
        primaryAuthorEmail: 'alice@example.com',
        ownershipPercentage: 90,
        primaryAuthorCommits: 45,
        totalCommits: 50,
        riskLevel: 'high',
      },
    ],
  },
  fragmentation: {
    files: [
      {
        file: 'src/fragmented.ts',
        authorCount: 5,
        totalCommits: 100,
        averageCommitsPerAuthor: 20,
        riskLevel: 'medium',
      },
    ],
  },
  ownerChurn: {
    files: [
      {
        file: 'src/owner-churn.ts',
        previousOwner: 'Bob',
        previousOwnerEmail: 'bob@example.com',
        previousOwnerLastCommit: '2024-01-01T00:00:00.000Z',
        currentOwner: 'Carol',
        currentOwnerEmail: 'carol@example.com',
        currentOwnerFirstCommit: '2024-02-01T00:00:00.000Z',
        daysSinceTransition: 30,
        riskLevel: 'low',
      },
    ],
  },
});

describe('BusFactorAndOwnership', () => {
  it('renders single-maintainer risk section by default', () => {
    const analytics = makeMockAnalytics();

    render(
      <BusFactorAndOwnership
        singleMaintainerRisk={analytics.singleMaintainerRisk}
        fragmentation={analytics.fragmentation}
        ownerChurn={analytics.ownerChurn}
      />
    );

    // Label appears both in the tab button and section heading
    const headings = screen.getAllByText('Single-Maintainer Risk');
    expect(headings.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Repository-Level Risk')).toBeInTheDocument();
    expect(screen.getByText('Primary Maintainer')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('switches to Fragmentation section when tab is clicked', () => {
    const analytics = makeMockAnalytics();

    render(
      <BusFactorAndOwnership
        singleMaintainerRisk={analytics.singleMaintainerRisk}
        fragmentation={analytics.fragmentation}
        ownerChurn={analytics.ownerChurn}
      />
    );

    fireEvent.click(screen.getByText('Fragmentation'));

    expect(screen.getByText('Fragmented Files')).toBeInTheDocument();
    expect(screen.getByText('Top Fragmented Files')).toBeInTheDocument();
  });

  it('switches to Owner Churn section when tab is clicked', () => {
    const analytics = makeMockAnalytics();

    render(
      <BusFactorAndOwnership
        singleMaintainerRisk={analytics.singleMaintainerRisk}
        fragmentation={analytics.fragmentation}
        ownerChurn={analytics.ownerChurn}
      />
    );

    fireEvent.click(screen.getByText('Owner Churn'));

    expect(screen.getByText('Files with Owner Churn')).toBeInTheDocument();
    expect(screen.getByText('Previous Owner')).toBeInTheDocument();
    expect(screen.getByText('Current Owner')).toBeInTheDocument();
  });

  it('handles empty data sets gracefully', () => {
    const emptyAnalytics: BusFactorAndOwnershipType = {
      singleMaintainerRisk: {
        repoRisk: null,
        files: [],
      },
      fragmentation: {
        files: [],
      },
      ownerChurn: {
        files: [],
      },
    };

    render(
      <BusFactorAndOwnership
        singleMaintainerRisk={emptyAnalytics.singleMaintainerRisk}
        fragmentation={emptyAnalytics.fragmentation}
        ownerChurn={emptyAnalytics.ownerChurn}
      />
    );

    expect(screen.getByText('No single-maintainer risk files found.')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Fragmentation'));
    expect(screen.getByText('No fragmented files found.')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Owner Churn'));
    expect(screen.getByText('No owner churn detected.')).toBeInTheDocument();
  });
});
