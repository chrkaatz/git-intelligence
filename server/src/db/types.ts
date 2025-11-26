export interface Repository {
  id: string;
  projectId: string;
  path: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CachedStats {
  stats: any; // GitStats structure
  cachedAt: string;
  repoPath: string;
}

export interface CachedCodebaseHealth {
  health: any; // CodebaseHealth structure
  cachedAt: string;
  repoPath: string;
}

export interface CachedTechnicalDebtIndicators {
  indicators: any; // TechnicalDebtIndicators structure
  cachedAt: string;
  repoPath: string;
}

export interface DatabaseSchema {
  projects: Project[];
  repositories: Repository[];
  analysisCache: Record<string, CachedStats>; // keyed by repository path
  codebaseHealthCache: Record<string, CachedCodebaseHealth>; // keyed by repository path
  technicalDebtCache?: Record<string, CachedTechnicalDebtIndicators>; // keyed by repository path
  schemaVersion?: number; // Track schema version for migrations
}
