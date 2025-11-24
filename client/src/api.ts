import axios from 'axios';

export interface AuthorStats {
  name: string;
  email: string;
  commits: number;
  firstCommit: string;
  lastCommit: string;
  percentage: string;
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
  path: string;
  name: string;
}

const api = axios.create({
  baseURL: 'http://localhost:3001',
});

export const getProjects = async (): Promise<Project[]> => {
  const response = await api.get('/projects');
  return response.data;
};

export const addProject = async (path: string): Promise<Project> => {
  const response = await api.post('/projects', { path });
  return response.data;
};

export const uploadProject = async (file: File): Promise<Project> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const removeProject = async (id: string): Promise<void> => {
  await api.delete(`/projects/${id}`);
};

export const getStats = async (path: string): Promise<GitStats> => {
  const response = await api.get('/stats', { params: { path } });
  return response.data;
};
