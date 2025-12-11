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
  aiInsights?: string;
}

export interface CrossRepoDeveloperStats extends DeveloperAuthorStats {
  repoSpread: {
    repoName: string;
    repoPath: string;
    commits: number;
    linesAdded: number;
    linesRemoved: number;
  }[];
  repoCount: number;
}

export interface CrossRepoDeveloperAnalytics {
  authors: CrossRepoDeveloperStats[];
  totalRepos: number;
  repoNames: string[];
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
  order?: number; // Order for sorting projects (lower numbers appear first)
  createdAt?: string;
  updatedAt?: string;
}

export interface Repository {
  id: string;
  projectId: string;
  path: string;
  name: string;
  order?: number; // Order for sorting repositories within a project (lower numbers appear first)
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

export const updateProject = async (
  id: string,
  updates: { name?: string; description?: string }
): Promise<Project> => {
  const response = await api.put(`/projects/${id}`, updates);
  return response.data;
};

export const removeProject = async (id: string): Promise<void> => {
  await api.delete(`/projects/${id}`);
};

export const reorderProjects = async (projectIds: string[]): Promise<void> => {
  await api.post('/projects/reorder', { projectIds });
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

export const addRepository = async (
  projectId: string,
  path: string,
  name?: string,
  replace?: boolean
): Promise<Repository> => {
  const response = await api.post('/repositories', { projectId, path, name, replace });
  return response.data;
};

export const removeRepository = async (id: string): Promise<void> => {
  await api.delete(`/repositories/${id}`);
};

export const reorderRepositories = async (
  projectId: string,
  repositoryIds: string[]
): Promise<void> => {
  await api.post('/repositories/reorder', { projectId, repositoryIds });
};

export interface FetchRepositoryResult {
  success: boolean;
  repository: {
    id: string;
    name: string;
    path: string;
  };
  changes: {
    fetched: boolean;
    pulled: boolean;
    hasChanges: boolean;
    branch: string;
    beforeHash: string;
    afterHash: string;
  };
  pullError?: string | null;
  message: string;
}

export const fetchRepositoryChanges = async (id: string): Promise<FetchRepositoryResult> => {
  const response = await api.post(`/repositories/${id}/fetch`);
  return response.data;
};

export const uploadRepository = async (
  file: File,
  projectId: string,
  name?: string,
  replace?: boolean
): Promise<Repository> => {
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

export const getStats = async (repoId: string, refresh?: boolean): Promise<GitStats> => {
  const response = await api.get('/stats', {
    params: { repoId, refresh: refresh ? 'true' : undefined },
  });
  return response.data;
};

export const getDeveloperAnalytics = async (
  repoId: string,
  refresh?: boolean,
  includeAIInsights?: boolean
): Promise<DeveloperAnalytics> => {
  const response = await api.get('/developer-analytics', {
    params: {
      repoId,
      refresh: refresh ? 'true' : undefined,
      ai: includeAIInsights ? 'true' : undefined,
    },
  });
  return response.data;
};

export const getCrossRepoDeveloperAnalytics = async (
  projectId: string,
  refresh?: boolean
): Promise<CrossRepoDeveloperAnalytics> => {
  const response = await api.get('/cross-repo-developer-analytics', {
    params: { projectId, refresh: refresh ? 'true' : undefined },
  });
  return response.data;
};

export interface FileHotspot {
  file: string;
  commits: number;
}

export interface DirectoryHotspot {
  directory: string;
  commits: number;
}

export interface Hotspots {
  files: FileHotspot[];
  directories: DirectoryHotspot[];
}

export interface ChangeCouplingPair {
  file1: string;
  file2: string;
  coChanges: number;
  coChangePercentage: number;
}

export interface ChangeCoupling {
  pairs: ChangeCouplingPair[];
}

export interface StabilityFile {
  file: string;
  ageDays: number;
  changeFrequency: number;
  status: 'stable' | 'evolving' | 'unstable';
}

export interface Stability {
  files: StabilityFile[];
}

export interface ComplexityFile {
  file: string;
  averageDiffSize: number;
}

export interface LargestDiff {
  file: string;
  linesChanged: number;
  commitHash: string;
}

export interface MostRewritten {
  file: string;
  rewritePercentage: number;
  totalLines: number;
  rewrittenLines: number;
}

export interface Complexity {
  averageDiffSizes: ComplexityFile[];
  largestDiffs: LargestDiff[];
  mostRewritten: MostRewritten[];
}

export interface BranchInfo {
  name: string;
  lastCommitDate: string;
  daysSinceLastCommit: number;
  isMerged: boolean;
}

export interface RepositoryHygiene {
  branchCount: number;
  unmergedBranchCount: number;
  oldestUnmergedBranchDays: number;
  unmergedBranches: BranchInfo[];
  dependencyAutomation: {
    hasDependabot: boolean;
    hasRenovate: boolean;
    configFiles: string[];
  };
  cicdAutomation: {
    hasGitHubActions: boolean;
    hasGitLabCI: boolean;
    hasCircleCI: boolean;
    hasJenkins: boolean;
    configFiles: string[];
  };
}

export interface CodebaseHealth {
  hotspots: Hotspots;
  changeCoupling: ChangeCoupling;
  stability: Stability;
  complexity: Complexity;
  hygiene: RepositoryHygiene;
  aiInsights?: string;
}

export const getCodebaseHealth = async (
  repoId: string,
  refresh: boolean = false,
  includeAIInsights?: boolean
): Promise<CodebaseHealth> => {
  const response = await api.get('/codebase-health', {
    params: {
      repoId,
      refresh: refresh ? 'true' : 'false',
      ai: includeAIInsights ? 'true' : undefined,
    },
  });
  return response.data;
};

export interface CrossRepoHotspot {
  repoName: string;
  repoPath: string;
  totalCommits: number;
  totalFiles: number;
  totalDirectories: number;
  topFiles: FileHotspot[];
  topDirectories: DirectoryHotspot[];
}

export interface CrossRepoCodebaseHealth {
  hotspots: {
    repositories: CrossRepoHotspot[];
    aggregatedFiles: FileHotspot[];
    aggregatedDirectories: DirectoryHotspot[];
  };
  totalRepos: number;
  repoNames: string[];
}

export const getCrossRepoCodebaseHealth = async (
  projectId: string,
  refresh: boolean = false
): Promise<CrossRepoCodebaseHealth> => {
  const response = await api.get('/cross-repo-codebase-health', {
    params: { projectId, refresh: refresh ? 'true' : 'false' },
  });
  return response.data;
};

// Repository Evolution Analytics Types
export interface CommitFrequency {
  date: string;
  commits: number;
}

export interface ReleaseInfo {
  tag: string;
  date: string;
  commitHash: string;
  message?: string;
}

export interface GrowthCurve {
  date: string;
  loc: number;
  files: number;
}

export interface ChangeBurst {
  date: string;
  commits: number;
  linesAdded: number;
  linesRemoved: number;
  netChange: number;
  isRefactor: boolean;
}

export interface ChurnMetrics {
  date: string;
  additions: number;
  deletions: number;
  netChange: number;
  churnRatio: number;
}

export interface RepositoryEvolution {
  commitFrequency: CommitFrequency[];
  releases: ReleaseInfo[];
  growthCurve: GrowthCurve[];
  changeBursts: ChangeBurst[];
  churnMetrics: ChurnMetrics[];
  totalCommits: number;
  totalReleases: number;
  averageCommitsPerDay: number;
  averageChurnRatio: number;
  refactorCount: number;
  aiInsights?: string;
}

export interface CrossRepoRepositoryEvolution {
  repositories: {
    repoName: string;
    repoPath: string;
    evolution: RepositoryEvolution;
  }[];
  synchronization: {
    date: string;
    repos: string[];
    commitCounts: Record<string, number>;
  }[];
  totalRepos: number;
  repoNames: string[];
}

export const getRepositoryEvolution = async (
  repoId: string,
  refresh?: boolean,
  includeAIInsights?: boolean
): Promise<RepositoryEvolution> => {
  const response = await api.get('/repository-evolution', {
    params: {
      repoId,
      refresh: refresh ? 'true' : undefined,
      ai: includeAIInsights ? 'true' : undefined,
    },
  });
  return response.data;
};

export const getCrossRepoRepositoryEvolution = async (
  projectId: string,
  refresh?: boolean
): Promise<CrossRepoRepositoryEvolution> => {
  const response = await api.get('/cross-repo-repository-evolution', {
    params: { projectId, refresh: refresh ? 'true' : undefined },
  });
  return response.data;
};

// Bus Factor & Ownership Analytics Types
export interface SingleMaintainerFile {
  file: string;
  primaryAuthor: string;
  primaryAuthorEmail: string;
  primaryAuthorCommits: number;
  totalCommits: number;
  ownershipPercentage: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface SingleMaintainerRepo {
  repoName: string;
  repoPath: string;
  primaryAuthor: string;
  primaryAuthorEmail: string;
  primaryAuthorCommits: number;
  totalCommits: number;
  ownershipPercentage: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface FragmentedFile {
  file: string;
  authorCount: number;
  totalCommits: number;
  averageCommitsPerAuthor: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface OwnerChurn {
  file: string;
  previousOwner: string;
  previousOwnerEmail: string;
  previousOwnerLastCommit: string;
  currentOwner: string;
  currentOwnerEmail: string;
  currentOwnerFirstCommit: string;
  daysSinceTransition: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface BusFactorAndOwnership {
  singleMaintainerRisk: {
    files: SingleMaintainerFile[];
    repoRisk?: {
      primaryAuthor: string;
      primaryAuthorEmail: string;
      primaryAuthorCommits: number;
      totalCommits: number;
      ownershipPercentage: number;
      riskLevel: 'low' | 'medium' | 'high';
    };
  };
  fragmentation: {
    files: FragmentedFile[];
  };
  ownerChurn: {
    files: OwnerChurn[];
  };
  aiInsights?: string;
}

export interface CrossRepoBusFactorAndOwnership {
  singleMaintainerRisk: {
    repositories: SingleMaintainerRepo[];
    aggregatedFiles: SingleMaintainerFile[];
  };
  fragmentation: {
    repositories: {
      repoName: string;
      repoPath: string;
      fragmentedFiles: FragmentedFile[];
    }[];
    aggregatedFiles: FragmentedFile[];
  };
  ownerChurn: {
    repositories: {
      repoName: string;
      repoPath: string;
      churnFiles: OwnerChurn[];
    }[];
    aggregatedFiles: OwnerChurn[];
  };
  totalRepos: number;
  repoNames: string[];
}

export const getBusFactorAndOwnership = async (
  repoId: string,
  refresh?: boolean,
  includeAIInsights?: boolean
): Promise<BusFactorAndOwnership> => {
  const response = await api.get('/bus-factor-and-ownership', {
    params: {
      repoId,
      refresh: refresh ? 'true' : undefined,
      ai: includeAIInsights ? 'true' : undefined,
    },
  });
  return response.data;
};

export const getCrossRepoBusFactorAndOwnership = async (
  projectId: string,
  refresh?: boolean
): Promise<CrossRepoBusFactorAndOwnership> => {
  const response = await api.get('/cross-repo-bus-factor-and-ownership', {
    params: { projectId, refresh: refresh ? 'true' : undefined },
  });
  return response.data;
};

// Social / Organizational Network Analysis Types
export interface CollaborationEdge {
  author1: string;
  author1Email: string;
  author2: string;
  author2Email: string;
  sharedFiles: number;
  sharedFilesList: string[];
  collaborationStrength: number;
}

export interface CollaborationNode {
  author: string;
  authorEmail: string;
  degree: number;
  totalSharedFiles: number;
}

export interface CollaborationGraph {
  nodes: CollaborationNode[];
  edges: CollaborationEdge[];
  clusters?: {
    clusterId: number;
    authors: string[];
    authorEmails: string[];
    size: number;
  }[];
}

export interface KnowledgeSilo {
  file: string;
  authorCount: number;
  authors: string[];
  authorEmails: string[];
  totalCommits: number;
  lastCommitDate: string;
  daysSinceLastCommit: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface OrphanedCode {
  file: string;
  lastCommitDate: string;
  daysSinceLastCommit: number;
  lastAuthor: string;
  lastAuthorEmail: string;
  totalCommits: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface SocialNetworkAnalysis {
  collaborationGraph: CollaborationGraph;
  knowledgeSilos: KnowledgeSilo[];
  orphanedCode: OrphanedCode[];
  aiInsights?: string;
}

export interface CrossRepoCollaboration {
  author1: string;
  author1Email: string;
  author2: string;
  author2Email: string;
  sharedRepos: string[];
  sharedReposCount: number;
  collaborationStrength: number;
}

export interface RepoCluster {
  clusterId: number;
  repos: string[];
  repoPaths: string[];
  authors: string[];
  authorEmails: string[];
  size: number;
}

export interface CrossRepoSocialNetworkAnalysis {
  crossRepoCollaboration: CrossRepoCollaboration[];
  repoClusters: RepoCluster[];
  totalRepos: number;
  repoNames: string[];
}

export const getSocialNetworkAnalysis = async (
  repoId: string,
  refresh?: boolean,
  includeAIInsights?: boolean
): Promise<SocialNetworkAnalysis> => {
  const response = await api.get('/social-network-analysis', {
    params: {
      repoId,
      refresh: refresh ? 'true' : undefined,
      ai: includeAIInsights ? 'true' : undefined,
    },
  });
  return response.data;
};

export const getCrossRepoSocialNetworkAnalysis = async (
  projectId: string,
  refresh?: boolean
): Promise<CrossRepoSocialNetworkAnalysis> => {
  const response = await api.get('/cross-repo-social-network-analysis', {
    params: { projectId, refresh: refresh ? 'true' : undefined },
  });
  return response.data;
};

// Risk Analytics Types
export interface HighRiskHotspot {
  file: string;
  riskScore: number; // 0-100
  churn: number; // Number of commits
  complexity: number; // Average diff size
  ownershipDiversity: number; // Number of authors
  riskLevel: 'low' | 'medium' | 'high';
}

export interface TemporalCouplingHotspot {
  file: string;
  couplingCount: number; // Number of files it changes with
  relatedFiles: string[]; // Top related files
  totalCoChanges: number; // Total co-change count
  riskLevel: 'low' | 'medium' | 'high';
}

export interface RiskyFileTrend {
  file: string;
  currentRiskScore: number;
  trendPoints: { date: string; riskScore: number }[];
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  trendPercentage: number; // Percentage change
  riskLevel: 'low' | 'medium' | 'high';
}

export interface RiskAnalytics {
  highRiskHotspots: HighRiskHotspot[];
  temporalCouplingHotspots: TemporalCouplingHotspot[];
  riskyFileTrends: RiskyFileTrend[];
  aiInsights?: string;
}

export interface CrossRepoRiskAnalytics {
  highRiskHotspots: {
    repositories: {
      repoName: string;
      repoPath: string;
      hotspots: HighRiskHotspot[];
    }[];
    aggregatedFiles: HighRiskHotspot[];
  };
  temporalCouplingHotspots: {
    repositories: {
      repoName: string;
      repoPath: string;
      hotspots: TemporalCouplingHotspot[];
    }[];
    aggregatedFiles: TemporalCouplingHotspot[];
  };
  riskyFileTrends: {
    repositories: {
      repoName: string;
      repoPath: string;
      trends: RiskyFileTrend[];
    }[];
    aggregatedFiles: RiskyFileTrend[];
  };
  totalRepos: number;
  repoNames: string[];
}

export const getRiskAnalytics = async (
  repoId: string,
  refresh?: boolean,
  includeAIInsights?: boolean
): Promise<RiskAnalytics> => {
  const response = await api.get('/risk-analytics', {
    params: {
      repoId,
      refresh: refresh ? 'true' : undefined,
      ai: includeAIInsights ? 'true' : undefined,
    },
  });
  return response.data;
};

export const getCrossRepoRiskAnalytics = async (
  projectId: string,
  refresh?: boolean
): Promise<CrossRepoRiskAnalytics> => {
  const response = await api.get('/cross-repo-risk-analytics', {
    params: { projectId, refresh: refresh ? 'true' : undefined },
  });
  return response.data;
};

// Technical Debt Indicators Types
export interface CommentedOutCode {
  file: string;
  commitHash: string;
  commitDate: string;
  linesCommented: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface HugeCommit {
  commitHash: string;
  commitDate: string;
  author: string;
  authorEmail: string;
  message: string;
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  totalChanges: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface WipCommit {
  commitHash: string;
  commitDate: string;
  author: string;
  authorEmail: string;
  message: string;
  wipKeywords: string[];
}

export interface QuickFixCommit {
  commitHash: string;
  commitDate: string;
  author: string;
  authorEmail: string;
  message: string;
  quickFixKeywords: string[];
}

export interface LargeBinaryFile {
  file: string;
  commitHash: string;
  commitDate: string;
  sizeBytes: number;
  sizeMB: number;
  fileType: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface VendoredCodeGrowth {
  directory: string;
  initialSize: number;
  currentSize: number;
  growthPercentage: number;
  filesAdded: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface LongLivedBranch {
  branchName: string;
  createdAt: string;
  lastCommitDate: string;
  daysSinceCreation: number;
  daysSinceLastCommit: number;
  commitCount: number;
  isMerged: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface DependencyBump {
  lockfile: string;
  commitHash: string;
  commitDate: string;
  dependenciesAdded: number;
  dependenciesRemoved: number;
  dependenciesUpdated: number;
  totalChanges: number;
}

export interface StaleDependency {
  lockfile: string;
  lastUpdated: string;
  daysSinceUpdate: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface TechnicalDebtIndicators {
  commentedOutCode: CommentedOutCode[];
  hugeCommits: HugeCommit[];
  wipCommits: WipCommit[];
  quickFixCommits: QuickFixCommit[];
  largeBinaryFiles: LargeBinaryFile[];
  vendoredCodeGrowth: VendoredCodeGrowth[];
  longLivedBranches: LongLivedBranch[];
  branchProliferation: {
    totalBranches: number;
    activeBranches: number;
    mergedBranches: number;
    unmergedBranches: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
  dependencyDrift: {
    lockfiles: string[];
    dependencyBumps: DependencyBump[];
    staleDependencies: StaleDependency[];
  };
  missingAutomation: {
    hasDependencyAutomation: boolean;
    hasCicdAutomation: boolean;
    dependencyAutomationFiles: string[];
    cicdAutomationFiles: string[];
    riskLevel: 'low' | 'medium' | 'high';
  };
  aiInsights?: string;
}

export interface CrossRepoTechnicalDebtIndicators {
  repositories: {
    repoName: string;
    repoPath: string;
    indicators: TechnicalDebtIndicators;
  }[];
  aggregated: {
    totalCommentedOutCode: number;
    totalHugeCommits: number;
    totalWipCommits: number;
    totalQuickFixCommits: number;
    totalLargeBinaryFiles: number;
    totalVendoredCodeGrowth: number;
    totalLongLivedBranches: number;
    averageBranchProliferation: number;
    reposWithStaleDependencies: number;
    reposWithoutDependencyAutomation: number;
    reposWithoutCicdAutomation: number;
  };
  totalRepos: number;
  repoNames: string[];
}

export interface JobStatus {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  currentStep?: string;
  error?: string;
  result?: TechnicalDebtIndicators;
}

export const getTechnicalDebtIndicators = async (
  repoId: string,
  refresh?: boolean,
  includeAIInsights?: boolean
): Promise<TechnicalDebtIndicators> => {
  // Start the job or get cached result
  const jobResponse = await api.get('/technical-debt-indicators', {
    params: {
      repoId,
      refresh: refresh ? 'true' : undefined,
      ai: includeAIInsights ? 'true' : undefined,
    },
  });

  const responseData = jobResponse.data;

  // If the response is the actual data (cached result), return it immediately
  // Check if it has TechnicalDebtIndicators properties (e.g., commentedOutCode) and no jobId
  if (
    responseData &&
    !responseData.jobId &&
    !responseData.status &&
    (responseData.commentedOutCode !== undefined ||
      responseData.hugeCommits !== undefined ||
      responseData.wipCommits !== undefined)
  ) {
    // This is the actual TechnicalDebtIndicators data, not a job
    return responseData as TechnicalDebtIndicators;
  }

  // Otherwise, it's a job - extract jobId and poll
  const { jobId } = responseData;
  if (!jobId) {
    throw new Error('Invalid response from server: expected jobId or cached data');
  }

  // Poll for job completion
  return new Promise((resolve, reject) => {
    const pollInterval = setInterval(async () => {
      try {
        const statusResponse = await api.get('/technical-debt-indicators', {
          params: { jobId },
        });
        const status: JobStatus = statusResponse.data;

        if (status.status === 'completed' && status.result) {
          clearInterval(pollInterval);
          resolve(status.result);
        } else if (status.status === 'failed') {
          clearInterval(pollInterval);
          reject(new Error(status.error || 'Analysis failed'));
        }
        // Continue polling if pending or running
      } catch (error) {
        clearInterval(pollInterval);
        reject(error);
      }
    }, 1000); // Poll every second

    // Timeout after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      reject(new Error('Analysis timeout'));
    }, 300000);
  });
};

export const getTechnicalDebtIndicatorsStatus = async (jobId: string): Promise<JobStatus> => {
  const response = await api.get('/technical-debt-indicators', {
    params: { jobId },
  });
  return response.data;
};

export const getCrossRepoTechnicalDebtIndicators = async (
  projectId: string,
  refresh?: boolean
): Promise<CrossRepoTechnicalDebtIndicators> => {
  const response = await api.get('/cross-repo-technical-debt-indicators', {
    params: { projectId, refresh: refresh ? 'true' : undefined },
  });
  return response.data;
};

export const clearCache = async (repoId?: string): Promise<{ message: string }> => {
  const response = await api.post('/cache/clear', { repoId });
  return response.data;
};

// Ollama Settings API
export interface OllamaSettings {
  enabled: boolean;
  host: string;
  port: number;
  model: string;
  timeout?: number;
}

export interface OllamaTestResult {
  success: boolean;
  message?: string;
}

export const getOllamaSettings = async (): Promise<OllamaSettings> => {
  const response = await api.get('/settings/ollama');
  return response.data;
};

export const updateOllamaSettings = async (
  settings: Partial<OllamaSettings>
): Promise<OllamaSettings> => {
  const response = await api.put('/settings/ollama', settings);
  return response.data;
};

export const testOllamaConnection = async (
  settings?: Partial<OllamaSettings>
): Promise<OllamaTestResult> => {
  const response = await api.post('/settings/ollama/test', settings || {});
  return response.data;
};
