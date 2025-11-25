import axios from 'axios';

export interface AuthorStats {
  name: string;
  email: string;
  commits: number;
  firstCommit: string;
  lastCommit: string;
  percentage: string;
}

export interface DeveloperAuthorStats {
  name: string;
  email: string;
  commits: number;
  linesAdded: number;
  linesRemoved: number;
  netLines: number;
  firstCommit: string;
  lastCommit: string;
  percentage: string;
  activeTimeWindows: {
    hourOfDay: Record<number, number>;
    dayOfWeek: Record<number, number>;
  };
  signedCommits: number;
  signedCommitsPercentage: string;
  fixCommits: number;
  fixCommitRatio: string;
  revertCommits: number;
  revertCommitRatio: string;
  churn: number;
  churnRatio: string;
}

export interface AuthorActivityOverTime {
  authorName: string;
  authorEmail: string;
  weeklyActivity: { week: string; commits: number }[];
  monthlyActivity: { month: string; commits: number }[];
}

export interface OnboardingData {
  date: string;
  newAuthors: number;
  authorNames: string[];
}

export interface DormancyData {
  authorName: string;
  authorEmail: string;
  firstCommit: string;
  lastCommit: string;
  daysSinceLastCommit: number;
  totalCommits: number;
  status: 'active' | 'dormant' | 'inactive';
}

export interface LongitudinalPatterns {
  authorActivityOverTime: AuthorActivityOverTime[];
  onboardingCurve: OnboardingData[];
  dormancyDetection: DormancyData[];
}

export interface DeveloperAnalytics {
  authors: DeveloperAuthorStats[];
  longitudinalPatterns?: LongitudinalPatterns;
}

export interface ActivityStats {
  hourOfDay: Record<number, number>;
  dayOfWeek: Record<number, number>;
  monthOfYear: Record<number, number>;
  year: Record<number, number>;
}

export interface GitStats {
  summary: {
    totalCommits: number;
    totalAuthors: number;
    totalFiles: number;
  };
  authors: AuthorStats[];
  activity: ActivityStats;
  extensions: Record<string, number>;
  locHistory: { date: string; loc: number }[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Repository {
  id: string;
  projectId: string;
  path: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

const api = axios.create({
  baseURL: 'http://localhost:3001',
});

// Projects API
export const getProjects = async (): Promise<Project[]> => {
  const response = await api.get('/projects');
  return response.data;
};

export const getProject = async (id: string): Promise<Project> => {
  const response = await api.get(`/projects/${id}`);
  return response.data;
};

export const addProject = async (name: string, description?: string): Promise<Project> => {
  const response = await api.post('/projects', { name, description });
  return response.data;
};

export const updateProject = async (id: string, updates: { name?: string; description?: string }): Promise<Project> => {
  const response = await api.put(`/projects/${id}`, updates);
  return response.data;
};

export const removeProject = async (id: string): Promise<void> => {
  await api.delete(`/projects/${id}`);
};

// Repositories API
export const getRepositories = async (projectId?: string): Promise<Repository[]> => {
  const params = projectId ? { projectId } : {};
  const response = await api.get('/repositories', { params });
  return response.data;
};

export const getRepository = async (id: string): Promise<Repository> => {
  const response = await api.get(`/repositories/${id}`);
  return response.data;
};

export const addRepository = async (projectId: string, path: string, name?: string, replace?: boolean): Promise<Repository> => {
  const response = await api.post('/repositories', { projectId, path, name, replace });
  return response.data;
};

export const removeRepository = async (id: string): Promise<void> => {
  await api.delete(`/repositories/${id}`);
};

export const uploadRepository = async (file: File, projectId: string, name?: string, replace?: boolean): Promise<Repository> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('projectId', projectId);
  if (name) {
    formData.append('name', name);
  }
  if (replace !== undefined) {
    formData.append('replace', replace.toString());
  }
  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getStats = async (path: string): Promise<GitStats> => {
  const response = await api.get('/stats', { params: { path } });
  return response.data;
};

export const getDeveloperAnalytics = async (path: string): Promise<DeveloperAnalytics> => {
  const response = await api.get('/developer-analytics', { params: { path } });
  return response.data;
};
