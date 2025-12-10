import { createContext } from 'react';
import type { Project, Repository } from '../api';

export interface AppContextType {
  projects: Project[];
  repositories: Repository[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  handleAddProject: (name: string, description?: string) => Promise<void>;
  handleDeleteProject: (id: string) => Promise<void>;
  handleDeleteRepository: (id: string) => Promise<void>;
  handleReorderProjects: (projectIds: string[]) => Promise<void>;
  handleReorderRepositories: (projectId: string, repositoryIds: string[]) => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
