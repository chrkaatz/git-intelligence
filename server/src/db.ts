// Re-export all types and functions for backward compatibility
export type {
  Repository,
  Project,
  CachedStats,
  CachedCodebaseHealth,
  DatabaseSchema,
} from './db/types';

export { getProjects, getProject, addProject, updateProject, removeProject } from './db/projects';

export { getRepositories, getRepository, addRepository, removeRepository } from './db/repositories';

export {
  getCachedStats,
  setCachedStats,
  clearCache,
  getCachedCodebaseHealth,
  setCachedCodebaseHealth,
} from './db/cache';
