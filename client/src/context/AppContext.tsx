import { useEffect, useState, type ReactNode } from 'react';
import {
  getProjects,
  getRepositories,
  addProject,
  removeProject,
  removeRepository,
  reorderProjects,
  reorderRepositories,
  type Project,
  type Repository,
} from '../api';
import { AppContext } from './context';

// The client and server start as separate containers with no readiness
// handshake between them - on a stack restart the client's first request can
// beat the server to accepting connections. Retry the initial load a few
// times before surfacing an error, so a normal restart doesn't strand the
// user on an empty project list.
const INITIAL_LOAD_MAX_ATTEMPTS = 4;
const INITIAL_LOAD_RETRY_DELAY_MS = 1000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function AppProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (): Promise<boolean> => {
    try {
      setError(null);
      const [projectList, repoList] = await Promise.all([getProjects(), getRepositories()]);
      setProjects(projectList);
      setRepositories(repoList);
      return true;
    } catch (err) {
      setError('Failed to load data');
      console.error('Failed to load data:', err);
      return false;
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await loadData();
    setLoading(false);
  };

  useEffect(() => {
    const loadWithRetry = async () => {
      setLoading(true);
      for (let attempt = 1; attempt <= INITIAL_LOAD_MAX_ATTEMPTS; attempt++) {
        const succeeded = await loadData();
        if (succeeded) break;
        if (attempt < INITIAL_LOAD_MAX_ATTEMPTS) {
          await sleep(INITIAL_LOAD_RETRY_DELAY_MS * attempt);
        }
      }
      setLoading(false);
    };
    loadWithRetry();
  }, []);

  const handleAddProject = async (name: string, description?: string) => {
    try {
      await addProject(name, description);
      await refreshData();
    } catch {
      throw new Error('Failed to add project');
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await removeProject(id);
      await refreshData();
    } catch {
      throw new Error('Failed to remove project');
    }
  };

  const handleDeleteRepository = async (id: string) => {
    try {
      await removeRepository(id);
      await refreshData();
    } catch {
      throw new Error('Failed to remove repository');
    }
  };

  const handleReorderProjects = async (projectIds: string[]) => {
    try {
      await reorderProjects(projectIds);
      await refreshData();
    } catch {
      throw new Error('Failed to reorder projects');
    }
  };

  const handleReorderRepositories = async (projectId: string, repositoryIds: string[]) => {
    try {
      await reorderRepositories(projectId, repositoryIds);
      await refreshData();
    } catch {
      throw new Error('Failed to reorder repositories');
    }
  };

  return (
    <AppContext.Provider
      value={{
        projects,
        repositories,
        loading,
        error,
        refreshData,
        handleAddProject,
        handleDeleteProject,
        handleDeleteRepository,
        handleReorderProjects,
        handleReorderRepositories,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
