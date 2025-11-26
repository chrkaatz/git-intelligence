import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SummaryCards } from '../SummaryCards';
import type { GitStats } from '../../api';

describe('SummaryCards', () => {
  const mockStats: GitStats = {
    summary: {
      totalCommits: 1234,
      totalAuthors: 42,
      totalFiles: 567,
    },
    authors: [],
    activity: {
      hourOfDay: {},
      dayOfWeek: {},
      monthOfYear: {},
      year: {},
    },
    extensions: {},
    locHistory: [],
  };

  it('renders all three summary cards', () => {
    render(<SummaryCards stats={mockStats} />);

    expect(screen.getByText('Total Commits')).toBeInTheDocument();
    expect(screen.getByText('Contributors')).toBeInTheDocument();
    expect(screen.getByText('Files')).toBeInTheDocument();
  });

  it('displays correct values for each card', () => {
    render(<SummaryCards stats={mockStats} />);

    expect(screen.getByText('1,234')).toBeInTheDocument(); // formatted with toLocaleString
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('567')).toBeInTheDocument();
  });

  it('formats large numbers correctly', () => {
    const largeStats: GitStats = {
      ...mockStats,
      summary: {
        totalCommits: 1234567,
        totalAuthors: 999,
        totalFiles: 50000,
      },
    };

    render(<SummaryCards stats={largeStats} />);

    expect(screen.getByText('1,234,567')).toBeInTheDocument();
    expect(screen.getByText('999')).toBeInTheDocument();
    expect(screen.getByText('50,000')).toBeInTheDocument();
  });

  it('renders with zero values', () => {
    const zeroStats: GitStats = {
      ...mockStats,
      summary: {
        totalCommits: 0,
        totalAuthors: 0,
        totalFiles: 0,
      },
    };

    render(<SummaryCards stats={zeroStats} />);

    const zeroElements = screen.getAllByText('0');
    expect(zeroElements).toHaveLength(3);
    zeroElements.forEach((element) => {
      expect(element).toBeInTheDocument();
    });
  });
});
