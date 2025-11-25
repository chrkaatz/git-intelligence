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

export interface CodebaseHealth {
  hotspots: Hotspots;
  changeCoupling: ChangeCoupling;
  stability: Stability;
  complexity: Complexity;
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

