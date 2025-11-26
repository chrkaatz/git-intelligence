import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BusFactorAndOwnershipView } from '../BusFactorAndOwnershipView';
import { AppProvider } from '../../../context/AppContext';
import { NotificationProvider } from '../../../context/NotificationContext';
import { useParams } from '@tanstack/react-router';

vi.mock('@tanstack/react-router', () => ({
  useParams: vi.fn(),
}));

const mockedUseParams = vi.mocked(useParams);

const mockGetBusFactorAndOwnership = vi.fn();
const mockGetProjects = vi.fn();
const mockGetRepositories = vi.fn();
const mockAddProject = vi.fn();
const mockRemoveProject = vi.fn();
const mockRemoveRepository = vi.fn();

vi.mock('../../../api', async () => {
  const actual = await import('../../../api');
  return {
    ...actual,
    getBusFactorAndOwnership: (...args: unknown[]) => mockGetBusFactorAndOwnership(...args),
    getProjects: (...args: unknown[]) => mockGetProjects(...args),
    getRepositories: (...args: unknown[]) => mockGetRepositories(...args),
    addProject: (...args: unknown[]) => mockAddProject(...args),
    removeProject: (...args: unknown[]) => mockRemoveProject(...args),
    removeRepository: (...args: unknown[]) => mockRemoveRepository(...args),
  };
});

const renderWithProviders = (repoId?: string) => {
  mockedUseParams.mockReturnValue((repoId ? { repoId } : {}) as { repoId?: string });

  return render(
    <AppProvider>
      <NotificationProvider>
        <BusFactorAndOwnershipView />
      </NotificationProvider>
    </AppProvider>
  );
};

describe('BusFactorAndOwnershipView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProjects.mockResolvedValue([]);
    mockGetRepositories.mockResolvedValue([]);
    mockAddProject.mockResolvedValue(undefined);
    mockRemoveProject.mockResolvedValue(undefined);
    mockRemoveRepository.mockResolvedValue(undefined);
  });

  it('renders placeholder when no repository is selected', async () => {
    renderWithProviders();

    expect(
      screen.getByText(
        /No repository selected. Select a repository from the list to view bus factor and ownership analytics./i
      )
    ).toBeInTheDocument();
  });

  it('fetches and displays analytics when repoId is present', async () => {
    const repoId = 'repo-1';
    mockGetRepositories.mockResolvedValue([
      {
        id: repoId,
        projectId: 'project-1',
        path: '/path/to/repo',
        name: 'Test Repo',
      },
    ]);
    mockGetBusFactorAndOwnership.mockResolvedValue({
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
    });

    renderWithProviders(repoId);

    await waitFor(() => {
      expect(mockGetBusFactorAndOwnership).toHaveBeenCalled();
    });

    expect(screen.getByText('Bus Factor & Ownership Analytics')).toBeInTheDocument();
    expect(screen.getByText('Test Repo')).toBeInTheDocument();
  });

  it('shows error message when analytics fetch fails', async () => {
    const repoId = 'repo-1';
    mockGetRepositories.mockResolvedValue([
      {
        id: repoId,
        projectId: 'project-1',
        path: '/path/to/repo',
        name: 'Test Repo',
      },
    ]);
    mockGetBusFactorAndOwnership.mockRejectedValue(new Error('Failed to load'));

    renderWithProviders(repoId);

    await waitFor(() => {
      // Fallback error message comes from the thrown Error('Failed to load')
      expect(screen.getAllByText(/Failed to load/i).length).toBeGreaterThan(0);
    });
  });

  it('triggers refresh when recalculate button is clicked', async () => {
    const repoId = 'repo-1';
    mockGetRepositories.mockResolvedValue([
      {
        id: repoId,
        projectId: 'project-1',
        path: '/path/to/repo',
        name: 'Test Repo',
      },
    ]);
    mockGetBusFactorAndOwnership.mockResolvedValue({
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
    });

    renderWithProviders(repoId);

    await waitFor(() => {
      expect(mockGetBusFactorAndOwnership).toHaveBeenCalledTimes(1);
    });

    const button = screen.getByRole('button', { name: /Recalculate/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockGetBusFactorAndOwnership).toHaveBeenCalledTimes(2);
    });
  });
});
