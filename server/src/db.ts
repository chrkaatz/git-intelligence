// Re-export all types and functions for backward compatibility
export type {
  Repository,
  Project,
  CachedStats,
  CachedCodebaseHealth,
  DatabaseSchema,
  OllamaSettings,
} from './db/types.js';

export {
  getProjects,
  getProject,
  addProject,
  updateProject,
  removeProject,
  reorderProjects,
} from './db/projects.js';

export {
  getRepositories,
  getRepository,
  addRepository,
  removeRepository,
  reorderRepositories,
} from './db/repositories.js';

export {
  getCachedStats,
  setCachedStats,
  clearCache,
  getCachedCodebaseHealth,
  setCachedCodebaseHealth,
  getCachedTechnicalDebtIndicators,
  setCachedTechnicalDebtIndicators,
  getCachedDeveloperAnalytics,
  setCachedDeveloperAnalytics,
  getCachedRiskAnalytics,
  setCachedRiskAnalytics,
  getCachedBusFactorAndOwnership,
  setCachedBusFactorAndOwnership,
  getCachedRepositoryEvolution,
  setCachedRepositoryEvolution,
  getCachedSocialNetworkAnalysis,
  setCachedSocialNetworkAnalysis,
} from './db/cache.js';

export { getOllamaSettings, updateOllamaSettings } from './db/settings.js';
