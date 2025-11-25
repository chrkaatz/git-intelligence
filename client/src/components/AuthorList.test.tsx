import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthorList } from './AuthorList';
import type { AuthorStats } from '../api';

describe('AuthorList', () => {
  const mockAuthors: AuthorStats[] = [
    {
      name: 'John Doe',
      email: 'john@example.com',
      commits: 150,
      firstCommit: '2023-01-01',
      lastCommit: '2024-12-01',
      percentage: '45.5',
    },
    {
      name: 'Jane Smith',
      email: 'jane@example.com',
      commits: 100,
      firstCommit: '2023-02-01',
      lastCommit: '2024-11-15',
      percentage: '30.3',
    },
    {
      name: 'Bob Johnson',
      email: 'bob@example.com',
      commits: 50,
      firstCommit: '2023-03-01',
      lastCommit: '2024-10-20',
      percentage: '15.2',
    },
  ];

  it('renders the component with title', () => {
    render(<AuthorList authors={mockAuthors} />);
    expect(screen.getByText('Top Contributors')).toBeInTheDocument();
  });

  it('displays all authors in the list', () => {
    render(<AuthorList authors={mockAuthors} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
  });

  it('displays commit counts correctly', () => {
    render(<AuthorList authors={mockAuthors} />);

    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('displays percentage values', () => {
    render(<AuthorList authors={mockAuthors} />);

    expect(screen.getByText('45.5%')).toBeInTheDocument();
    expect(screen.getByText('30.3%')).toBeInTheDocument();
    expect(screen.getByText('15.2%')).toBeInTheDocument();
  });

  it('limits display to top 10 authors', () => {
    const manyAuthors: AuthorStats[] = Array.from({ length: 15 }, (_, i) => ({
      name: `Author ${i + 1}`,
      email: `author${i + 1}@example.com`,
      commits: 10,
      firstCommit: '2023-01-01',
      lastCommit: '2024-01-01',
      percentage: '10.0',
    }));

    render(<AuthorList authors={manyAuthors} />);

    // Should only show first 10
    expect(screen.getByText('Author 1')).toBeInTheDocument();
    expect(screen.getByText('Author 10')).toBeInTheDocument();
    expect(screen.queryByText('Author 11')).not.toBeInTheDocument();
  });

  it('handles empty authors list', () => {
    render(<AuthorList authors={[]} />);

    expect(screen.getByText('Top Contributors')).toBeInTheDocument();
    // Table headers should still be present
    expect(screen.getByText('Author')).toBeInTheDocument();
    expect(screen.getByText('Commits')).toBeInTheDocument();
  });
});

