export interface Repository {
  id: string;
  projectId: string;
  path: string;
  name: string;
  order?: number; // Order for sorting repositories within a project (lower numbers appear first)
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  order?: number; // Order for sorting projects (lower numbers appear first)
  createdAt?: string;
  updatedAt?: string;
}

export interface CachedStats {
  stats: any; // GitStats structure
  cachedAt: string;
  repoPath: string;
  latestCommitHash?: string; // Latest commit hash when cached
}

export interface CachedCodebaseHealth {
  health: any; // CodebaseHealth structure
  cachedAt: string;
  repoPath: string;
  latestCommitHash?: string; // Latest commit hash when cached
}

export interface CachedTechnicalDebtIndicators {
  indicators: any; // TechnicalDebtIndicators structure
  cachedAt: string;
  repoPath: string;
  latestCommitHash?: string; // Latest commit hash when cached
}

export interface CachedDeveloperAnalytics {
  analytics: any; // DeveloperAnalytics structure
  cachedAt: string;
  repoPath: string;
  latestCommitHash?: string; // Latest commit hash when cached
}

export interface CachedRiskAnalytics {
  analytics: any; // RiskAnalytics structure
  cachedAt: string;
  repoPath: string;
  latestCommitHash?: string; // Latest commit hash when cached
}

export interface CachedBusFactorAndOwnership {
  analytics: any; // BusFactorAndOwnership structure
  cachedAt: string;
  repoPath: string;
  latestCommitHash?: string; // Latest commit hash when cached
}

export interface CachedRepositoryEvolution {
  evolution: any; // RepositoryEvolution structure
  cachedAt: string;
  repoPath: string;
  latestCommitHash?: string; // Latest commit hash when cached
}

export interface CachedSocialNetworkAnalysis {
  analysis: any; // SocialNetworkAnalysis structure
  cachedAt: string;
  repoPath: string;
  latestCommitHash?: string; // Latest commit hash when cached
}

export interface CachedAIInsights {
  insights: string; // AI-generated insights
  cachedAt: string;
  repoPath: string;
  analysisType: string; // e.g., 'codebase-health', 'developer-analytics', etc.
  latestCommitHash?: string; // Latest commit hash when cached
}

export interface OllamaSettings {
  enabled: boolean; // Whether Ollama integration is enabled
  host: string; // Ollama host (default: 'localhost')
  port: number; // Ollama port (default: 11434)
  model: string; // Model name (e.g., 'llama3', 'mistral', 'codellama')
  timeout?: number; // Request timeout in ms (default: 30000)
}

export interface DatabaseSchema {
  projects: Project[];
  repositories: Repository[];
  analysisCache: Record<string, CachedStats>; // keyed by repository path
  codebaseHealthCache: Record<string, CachedCodebaseHealth>; // keyed by repository path
  technicalDebtCache?: Record<string, CachedTechnicalDebtIndicators>; // keyed by repository path
  developerAnalyticsCache?: Record<string, CachedDeveloperAnalytics>; // keyed by repository path
  riskAnalyticsCache?: Record<string, CachedRiskAnalytics>; // keyed by repository path
  busFactorCache?: Record<string, CachedBusFactorAndOwnership>; // keyed by repository path
  repositoryEvolutionCache?: Record<string, CachedRepositoryEvolution>; // keyed by repository path
  socialNetworkAnalysisCache?: Record<string, CachedSocialNetworkAnalysis>; // keyed by repository path
  aiInsightsCache?: Record<string, CachedAIInsights>; // keyed by `${repoPath}:${analysisType}`
  ollamaSettings?: OllamaSettings; // Ollama configuration settings
  schemaVersion?: number; // Track schema version for migrations
}
