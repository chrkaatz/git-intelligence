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

export function AppProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [projectList, repoList] = await Promise.all([getProjects(), getRepositories()]);
      setProjects(projectList);
      setRepositories(repoList);
    } catch (err) {
      setError('Failed to load data');
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
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
