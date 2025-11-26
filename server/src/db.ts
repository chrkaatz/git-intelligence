// Re-export all types and functions for backward compatibility
export type {
  Repository,
  Project,
  CachedStats,
  CachedCodebaseHealth,
  DatabaseSchema,
} from './db/types.js';

export {
  getProjects,
  getProject,
  addProject,
  updateProject,
  removeProject,
} from './db/projects.js';

export {
  getRepositories,
  getRepository,
  addRepository,
  removeRepository,
} from './db/repositories.js';

export {
  getCachedStats,
  setCachedStats,
  clearCache,
  getCachedCodebaseHealth,
  setCachedCodebaseHealth,
} from './db/cache.js';
