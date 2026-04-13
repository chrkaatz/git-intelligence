// Developer Analytics Types
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
  aiInsights?: string;
}

// Internal types (not exported)
export interface AuthorStats {
  name: string;
  email: string;
  commits: number;
  firstCommit: Date;
  lastCommit: Date;
}

export interface ActivityStats {
  hourOfDay: Record<number, number>;
  dayOfWeek: Record<number, number>;
  monthOfYear: Record<number, number>;
  year: Record<number, number>;
}

export type AuthorData = {
  name: string;
  email: string;
  commits: number;
  linesAdded: number;
  linesRemoved: number;
  firstCommit: Date;
  lastCommit: Date;
  activeTimeWindows: {
    hourOfDay: Record<number, number>;
    dayOfWeek: Record<number, number>;
  };
  signedCommits: number;
  nameVariants: Map<string, number>;
  emails: Set<string>;
  fixCommits: number;
  revertCommits: number;
};

// Codebase Health Types
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

// Repository Evolution Types
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

// Bus Factor & Ownership Types
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

// Social / Organizational Network Analysis Types
export interface CollaborationEdge {
  author1: string;
  author1Email: string;
  author2: string;
  author2Email: string;
  sharedFiles: number;
  sharedFilesList: string[];
  collaborationStrength: number; // Normalized score 0-1
}

export interface CollaborationNode {
  author: string;
  authorEmail: string;
  degree: number; // Number of connections
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

// Risk Analytics Types
export interface HighRiskHotspot {
  file: string;
  riskScore: number; // 0-100
  churn: number; // Number of commits
  complexity: number; // Average diff size
  ownershipDiversity: number; // Number of authors
  riskLevel: 'low' | 'medium' | 'high';
  coverage?: number; // Coverage percentage (0-100)
  linesFound?: number;
  linesHit?: number;
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
  coverage?: {
    totalCoverage: number;
    files: Record<string, { coverage: number; linesFound: number; linesHit: number }>;
  };
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
  coverage?: {
    averageCoverage: number;
    repositories: { repoName: string; coverage: number }[];
  };
}

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

/** Paths ranked by how often they appear in name-only commit history (see readiness diagnostics). */
export interface ReadinessRankedPath {
  path: string;
  touches: number;
  rank: number;
}

export interface ReadinessContributor {
  name: string;
  commits: number;
  rank: number;
}

export interface ReadinessFirefightingCommit {
  hash: string;
  date: string;
  subject: string;
}

/** Git-history signals inspired by common “before reading code” diagnostics (churn, authorship, bugs, rhythm). */
export interface ReadinessDiagnostics {
  generatedAt: string;
  windows: {
    churnSince: string;
    firefightingSince: string;
    recentContributorsSince: string;
  };
  topChurnFiles: ReadinessRankedPath[];
  bugFixTouchFiles: ReadinessRankedPath[];
  /** Paths that appear among top churn and top bug-touch lists. */
  highRiskOverlap: string[];
  contributorsAllTime: ReadinessContributor[];
  contributorsRecent: ReadinessContributor[];
  dominantContributorSharePercent: number;
  /** True when the top all-time contributor has no commits in the recent window. */
  topContributorInactiveRecently: boolean;
  commitsByMonth: { month: string; count: number }[];
  firefightingCommits: ReadinessFirefightingCommit[];
  caveats: string[];
  aiInsights?: string;
}

export interface CrossRepoReadinessDiagnostics {
  repositories: {
    repoName: string;
    repoPath: string;
    diagnostics: ReadinessDiagnostics;
  }[];
  totalRepos: number;
  repoNames: string[];
  aggregatedCommitsByMonth: { month: string; count: number }[];
  aggregatedContributors: ReadinessContributor[];
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
