import { generateCompletion } from './ollama.js';
import { shouldExcludeFileFromAnalysis } from '../git/utils.js';
import type { OllamaSettings } from '../db/types.js';
import type {
  CodebaseHealth,
  DeveloperAnalytics,
  RepositoryEvolution,
  BusFactorAndOwnership,
  SocialNetworkAnalysis,
  RiskAnalytics,
  TechnicalDebtIndicators,
} from '../git/types.js';

export type AnalysisType =
  | 'codebase-health'
  | 'developer-analytics'
  | 'repository-evolution'
  | 'bus-factor'
  | 'social-network'
  | 'code-quality'
  | 'commit-messages'
  | 'contributor-behavior'
  | 'technical-debt'
  | 'risk-assessment'
  | 'risk-analytics'
  | 'technical-debt-indicators';

/**
 * Generate AI insights for a specific analysis type
 * @param analysisType - Type of analysis to perform
 * @param data - The analysis data (CodebaseHealth, DeveloperAnalytics, etc.)
 * @param settings - Ollama configuration settings
 * @returns Promise resolving to generated insights text
 */
export async function generateInsights(
  analysisType: AnalysisType,
  data: unknown,
  settings: OllamaSettings
): Promise<string> {
  if (!settings.enabled) {
    throw new Error('Ollama is not enabled');
  }

  const prompt = buildAnalysisPrompt(analysisType, data);
  return generateCompletion(prompt, settings);
}

/**
 * Build a prompt for analysis based on type and data
 * @param analysisType - Type of analysis
 * @param data - The analysis data
 * @returns Formatted prompt string
 */
function buildAnalysisPrompt(analysisType: AnalysisType, data: unknown): string {
  const basePrompt = `You are an expert software engineering analyst. Analyze the following Git repository data and provide actionable insights. Be concise, specific, and focus on practical recommendations.

Analysis Type: ${analysisType}

Data:
${JSON.stringify(data, null, 2)}

Please provide:
1. Key insights and patterns identified
2. Potential issues or risks
3. Actionable recommendations

Format your response as clear, structured text with bullet points where appropriate.`;

  switch (analysisType) {
    case 'codebase-health':
      return buildCodebaseHealthPrompt(data as CodebaseHealth);

    case 'code-quality':
      return buildCodeQualityPrompt(data as CodebaseHealth);

    case 'developer-analytics':
      return buildDeveloperAnalyticsPrompt(data as DeveloperAnalytics);

    case 'contributor-behavior':
      return buildContributorBehaviorPrompt(data as DeveloperAnalytics);

    case 'repository-evolution':
      return buildRepositoryEvolutionPrompt(data as RepositoryEvolution);

    case 'bus-factor':
      return buildBusFactorPrompt(data as BusFactorAndOwnership);

    case 'risk-assessment':
      return buildRiskAssessmentPrompt(data as BusFactorAndOwnership);

    case 'social-network':
      return buildSocialNetworkPrompt(data as SocialNetworkAnalysis);

    case 'commit-messages':
      return buildCommitMessagesPrompt(
        data as {
          summary: { totalCommits: number; totalAuthors: number; totalFiles: number };
          authors: Array<{ name: string; commits: number; percentage: string }>;
          activity: { hourOfDay: Record<number, number> };
        }
      );

    case 'technical-debt':
      return buildTechnicalDebtPrompt(data as CodebaseHealth);

    case 'risk-analytics':
      return buildRiskAnalyticsPrompt(data as RiskAnalytics);

    case 'technical-debt-indicators':
      return buildTechnicalDebtIndicatorsPrompt(data as TechnicalDebtIndicators);

    default:
      return basePrompt;
  }
}

/**
 * Build prompt for codebase health analysis
 */
function buildCodebaseHealthPrompt(data: CodebaseHealth): string {
  // Filter out excluded files before sending to AI
  const topHotspots = data.hotspots.files
    .filter((f) => !shouldExcludeFileFromAnalysis(f.file))
    .slice(0, 10);
  const topDirectories = data.hotspots.directories.slice(0, 10);
  const topCoupling = data.changeCoupling.pairs
    .filter(
      (p) => !shouldExcludeFileFromAnalysis(p.file1) && !shouldExcludeFileFromAnalysis(p.file2)
    )
    .slice(0, 10);
  const unstableFiles = data.stability.files
    .filter((f) => f.status === 'unstable' && !shouldExcludeFileFromAnalysis(f.file))
    .slice(0, 10);
  const complexFiles = data.complexity.averageDiffSizes
    .filter((f) => !shouldExcludeFileFromAnalysis(f.file))
    .slice(0, 10);

  return `You are an expert software engineering analyst. Analyze the following codebase health metrics and provide actionable insights.

Codebase Health Analysis:

HOTSPOTS (Most Frequently Changed Files):
${topHotspots.map((h) => `- ${h.file}: ${h.commits} commits`).join('\n')}

TOP DIRECTORIES:
${topDirectories.map((d) => `- ${d.directory}: ${d.commits} commits`).join('\n')}

CHANGE COUPLING (Files That Change Together):
${topCoupling.map((c) => `- ${c.file1} ↔ ${c.file2}: ${c.coChanges} co-changes (${c.coChangePercentage.toFixed(1)}%)`).join('\n')}

UNSTABLE FILES (High Change Frequency):
${unstableFiles.map((f) => `- ${f.file}: ${f.changeFrequency} changes, ${f.ageDays} days old`).join('\n')}

COMPLEXITY INDICATORS:
${complexFiles.map((c) => `- ${c.file}: avg diff size ${c.averageDiffSize.toFixed(0)} lines`).join('\n')}

REPOSITORY HYGIENE:
- Total branches: ${data.hygiene.branchCount}
- Unmerged branches: ${data.hygiene.unmergedBranchCount}
- Oldest unmerged branch: ${data.hygiene.oldestUnmergedBranchDays} days

Please provide:
1. **Key Insights**: Identify the most critical health issues
2. **Risk Factors**: Areas that pose the highest risk to maintainability
3. **Actionable Recommendations**: Specific steps to improve codebase health
4. **Priority Areas**: Which files/directories should be refactored first and why

Be specific and reference actual files/directories in your recommendations.`;
}

/**
 * Build prompt for code quality analysis
 */
function buildCodeQualityPrompt(data: CodebaseHealth): string {
  const prompt = buildCodebaseHealthPrompt(data);
  return `${prompt}

Focus specifically on:
- Code quality trends and patterns
- Areas with declining quality indicators
- Best practices violations
- Opportunities for quality improvements`;
}

/**
 * Build prompt for developer analytics
 */
function buildDeveloperAnalyticsPrompt(data: DeveloperAnalytics): string {
  const topContributors = data.authors.slice(0, 10);
  const highChurn = data.authors.filter((a) => parseFloat(a.churnRatio) > 50).slice(0, 5);
  const recentActivity = data.longitudinalPatterns?.authorActivityOverTime.slice(0, 5) || [];

  return `You are an expert software engineering analyst. Analyze the following developer analytics and provide insights about team dynamics and work patterns.

Developer Analytics:

TOP CONTRIBUTORS:
${topContributors.map((a) => `- ${a.name}: ${a.commits} commits, ${a.linesAdded} lines added, ${a.linesRemoved} lines removed, ${a.percentage} of total`).join('\n')}

HIGH CHURN CONTRIBUTORS (High Add/Delete Ratio):
${highChurn.map((a) => `- ${a.name}: ${a.churnRatio}% churn ratio`).join('\n')}

ACTIVITY PATTERNS:
${topContributors
  .map((a) => {
    const hourEntries = Object.entries(a.activeTimeWindows.hourOfDay);
    const dayEntries = Object.entries(a.activeTimeWindows.dayOfWeek);

    if (hourEntries.length === 0 && dayEntries.length === 0) {
      return `- ${a.name}: No activity patterns recorded`;
    }

    const peakHour =
      hourEntries.length > 0
        ? hourEntries.reduce((prev, curr) => (prev[1] > curr[1] ? prev : curr))[0]
        : 'N/A';
    const peakDay =
      dayEntries.length > 0
        ? dayEntries.reduce((prev, curr) => (prev[1] > curr[1] ? prev : curr))[0]
        : 'N/A';

    const dayName =
      peakDay !== 'N/A'
        ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parseInt(peakDay)]
        : 'N/A';

    return `- ${a.name}: Peak hour ${peakHour}:00, Peak day ${dayName}`;
  })
  .join('\n')}

${
  data.longitudinalPatterns
    ? `RECENT ACTIVITY TRENDS:
${recentActivity.map((a) => `- ${a.authorName}: ${a.weeklyActivity.length} weeks tracked`).join('\n')}`
    : ''
}

Please provide:
1. **Team Dynamics**: Insights about collaboration and work distribution
2. **Activity Patterns**: Notable patterns in when and how developers work
3. **Potential Concerns**: Areas that might indicate team health issues
4. **Recommendations**: Suggestions for improving team collaboration and productivity

Focus on actionable insights that can help the team work more effectively.`;
}

/**
 * Build prompt for contributor behavior analysis
 */
function buildContributorBehaviorPrompt(data: DeveloperAnalytics): string {
  const prompt = buildDeveloperAnalyticsPrompt(data);
  return `${prompt}

Focus specifically on:
- Individual contributor patterns and behaviors
- Work style differences
- Potential burnout or engagement issues
- Onboarding effectiveness (if data available)`;
}

/**
 * Build prompt for repository evolution
 */
function buildRepositoryEvolutionPrompt(data: RepositoryEvolution): string {
  const recentBursts = data.changeBursts.slice(-5);
  const recentReleases = data.releases.slice(-5);
  const recentGrowth = data.growthCurve.slice(-10);

  return `You are an expert software engineering analyst. Analyze the following repository evolution metrics and provide insights about growth patterns and maintenance needs.

Repository Evolution:

COMMIT FREQUENCY:
- Total commits: ${data.totalCommits}
- Average commits per day: ${data.averageCommitsPerDay.toFixed(2)}
- Total releases: ${data.totalReleases}

RECENT CHANGE BURSTS (High Activity Periods):
${recentBursts.map((b) => `- ${b.date}: ${b.commits} commits, ${b.isRefactor ? 'REFACTOR' : 'FEATURE'} (${b.netChange > 0 ? '+' : ''}${b.netChange} lines)`).join('\n')}

RECENT RELEASES:
${recentReleases.map((r) => `- ${r.tag} (${r.date}): ${r.message || 'No message'}`).join('\n')}

GROWTH TREND (Last 10 Data Points):
${recentGrowth.map((g) => `- ${g.date}: ${g.loc} LOC, ${g.files} files`).join('\n')}

CHURN METRICS:
- Average churn ratio: ${data.averageChurnRatio.toFixed(1)}%
- Refactor count: ${data.refactorCount}

Please provide:
1. **Growth Patterns**: Trends in codebase size and activity
2. **Maintenance Windows**: Optimal times for major refactoring based on activity patterns
3. **Capacity Planning**: Predictions about future maintenance needs
4. **Recommendations**: When to schedule technical debt work and major changes

Help identify the best times for maintenance and predict future needs.`;
}

/**
 * Build prompt for bus factor analysis
 */
function buildBusFactorPrompt(data: BusFactorAndOwnership): string {
  const singleMaintainer = data.singleMaintainerRisk.files.slice(0, 10);
  const fragmented = data.fragmentation.files.slice(0, 10);
  const ownerChurn = data.ownerChurn.files.slice(0, 10);

  return `You are an expert software engineering analyst. Analyze the following bus factor and ownership metrics to identify knowledge concentration risks.

Bus Factor & Ownership Analysis:

SINGLE MAINTAINER RISK (High Ownership Concentration):
${singleMaintainer
  .map(
    (f) =>
      `- ${f.file}: ${f.primaryAuthor} (${f.ownershipPercentage.toFixed(1)}% ownership, ${f.primaryAuthorCommits}/${f.totalCommits} commits)`
  )
  .join('\n')}

FRAGMENTATION (Too Many Contributors):
${fragmented
  .map(
    (f) =>
      `- ${f.file}: ${f.authorCount} contributors, ${f.averageCommitsPerAuthor.toFixed(1)} avg commits each`
  )
  .join('\n')}

OWNER CHURN (Changed Primary Maintainer):
${ownerChurn
  .map(
    (f) =>
      `- ${f.file}: Changed from ${f.previousOwner} to ${f.currentOwner} (${f.daysSinceTransition} days since transition)`
  )
  .join('\n')}

Please provide:
1. **Critical Risks**: Files/repositories with the highest bus factor risk
2. **Knowledge Concentration**: Areas where knowledge is too concentrated
3. **Mitigation Strategies**: Specific steps to reduce bus factor risk
4. **Team Structure Recommendations**: How to better distribute knowledge

Focus on actionable steps to reduce single points of failure.`;
}

/**
 * Build prompt for risk assessment
 */
function buildRiskAssessmentPrompt(data: BusFactorAndOwnership): string {
  const prompt = buildBusFactorPrompt(data);
  return `${prompt}

Additionally, assess:
- Overall project risk level
- Critical dependencies and single points of failure
- Timeline for risk mitigation
- Impact of losing key contributors`;
}

/**
 * Build prompt for social network analysis
 */
function buildSocialNetworkPrompt(data: SocialNetworkAnalysis): string {
  const topCollaborations = data.collaborationGraph.edges.slice(0, 10);
  const knowledgeSilos = data.knowledgeSilos.slice(0, 10);
  const orphaned = data.orphanedCode.slice(0, 10);

  return `You are an expert software engineering analyst. Analyze the following social network analysis to understand collaboration patterns and knowledge distribution.

Social Network Analysis:

TOP COLLABORATIONS (Developer Pairs):
${topCollaborations
  .map(
    (e) =>
      `- ${e.author1} ↔ ${e.author2}: ${e.sharedFiles} shared files, strength ${e.collaborationStrength.toFixed(2)}`
  )
  .join('\n')}

KNOWLEDGE SILOS (Limited Contributor Access):
${knowledgeSilos
  .map(
    (f) =>
      `- ${f.file}: Only ${f.authorCount} contributor(s), ${f.daysSinceLastCommit} days since last change`
  )
  .join('\n')}

ORPHANED CODE (No Recent Activity):
${orphaned
  .map(
    (f) =>
      `- ${f.file}: ${f.daysSinceLastCommit} days since last change, ${f.totalCommits} total commits`
  )
  .join('\n')}

Please provide:
1. **Collaboration Patterns**: How well the team collaborates
2. **Knowledge Silos**: Areas where knowledge is isolated
3. **Communication Gaps**: Potential communication issues
4. **Team Structure Insights**: Recommendations for improving collaboration

Help identify opportunities to improve team collaboration and knowledge sharing.`;
}

/**
 * Build prompt for commit message analysis
 */
function buildCommitMessagesPrompt(data: {
  summary: { totalCommits: number; totalAuthors: number; totalFiles: number };
  authors: Array<{ name: string; commits: number; percentage: string }>;
  activity: { hourOfDay: Record<number, number> };
}): string {
  // Extract sample commit messages from authors (if available)
  // Note: GitStats doesn't include commit messages, so we'll analyze based on available data
  const topAuthors = data.authors.slice(0, 10);
  const activityPatterns = Object.entries(data.activity.hourOfDay)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return `You are an expert software engineering analyst. Analyze commit patterns and provide insights about commit message quality and practices.

Commit Analysis:

TOP CONTRIBUTORS:
${topAuthors.map((a) => `- ${a.name}: ${a.commits} commits (${a.percentage} of total)`).join('\n')}

ACTIVITY PATTERNS:
${activityPatterns.map(([hour, count]) => `- Hour ${hour}:00: ${count} commits`).join('\n')}

REPOSITORY STATISTICS:
- Total commits: ${data.summary.totalCommits}
- Total authors: ${data.summary.totalAuthors}
- Total files: ${data.summary.totalFiles}

Please provide:
1. **Commit Quality Assessment**: Based on patterns, assess likely commit message quality
2. **Consistency Analysis**: Whether commit practices appear consistent
3. **Recommendations**: How to improve commit message quality and practices
4. **Best Practices**: Suggestions for better commit hygiene

Note: This analysis is based on commit patterns since individual commit messages are not available in this dataset.`;
}

/**
 * Build prompt for technical debt identification
 */
function buildTechnicalDebtPrompt(data: CodebaseHealth): string {
  const prompt = buildCodebaseHealthPrompt(data);
  return `${prompt}

Focus specifically on:
- Technical debt indicators (hotspots, complexity, instability)
- Debt accumulation patterns
- Refactoring priorities
- Cost of maintaining current code vs. refactoring
- Specific technical debt items with estimated effort

Provide a prioritized list of technical debt items with actionable refactoring recommendations.`;
}

/**
 * Build prompt for risk analytics
 */
function buildRiskAnalyticsPrompt(data: RiskAnalytics): string {
  const topHighRisk = data.highRiskHotspots.slice(0, 10);
  const topCoupling = data.temporalCouplingHotspots.slice(0, 10);
  const topTrends = data.riskyFileTrends
    .filter((t) => t.trendDirection === 'increasing')
    .slice(0, 10);

  return `You are an expert software engineering analyst. Analyze the following risk analytics to identify high-risk areas and potential issues.

Risk Analytics:

HIGH-RISK HOTSPOTS (Files with High Risk Scores):
${topHighRisk
  .map(
    (h) =>
      `- ${h.file}: Risk score ${h.riskScore.toFixed(2)}, ${h.churn} commits, ${h.ownershipDiversity} authors, ${h.complexity.toFixed(1)} complexity`
  )
  .join('\n')}

TEMPORAL COUPLING HOTSPOTS (Files That Change Together):
${topCoupling
  .map(
    (c) =>
      `- ${c.file}: ${c.couplingCount} coupled files, ${c.totalCoChanges} total co-changes, risk level: ${c.riskLevel}`
  )
  .join('\n')}

RISKY FILE TRENDS (Increasing Risk):
${topTrends
  .map(
    (t) =>
      `- ${t.file}: Risk score ${t.currentRiskScore.toFixed(2)} (${t.trendPercentage > 0 ? '+' : ''}${t.trendPercentage.toFixed(1)}% trend), ${t.trendDirection}`
  )
  .join('\n')}

Please provide:
1. **Critical Risk Areas**: Files and patterns that pose the highest risk to the project
2. **Risk Patterns**: Common risk factors and their implications
3. **Mitigation Strategies**: Specific steps to reduce risk in identified areas
4. **Priority Recommendations**: Which risks should be addressed first and why

Focus on actionable steps to reduce project risk and improve code stability.`;
}

/**
 * Build prompt for technical debt indicators
 */
function buildTechnicalDebtIndicatorsPrompt(data: TechnicalDebtIndicators): string {
  const topCommented = data.commentedOutCode.slice(0, 10);
  const topHugeCommits = data.hugeCommits.slice(0, 10);
  const topWip = data.wipCommits.slice(0, 10);
  const topQuickFix = data.quickFixCommits.slice(0, 10);
  const topBinary = data.largeBinaryFiles.slice(0, 10);
  const topVendored = data.vendoredCodeGrowth.slice(0, 10);
  const topBranches = data.longLivedBranches.slice(0, 10);
  const topStale = data.dependencyDrift.staleDependencies.slice(0, 10);

  return `You are an expert software engineering analyst. Analyze the following technical debt indicators to identify areas of concern and provide actionable recommendations.

Technical Debt Indicators:

COMMENTED-OUT CODE:
${topCommented
  .map(
    (c) =>
      `- ${c.file}: ${c.linesCommented} lines commented, ${c.commitDate}, risk level: ${c.riskLevel}`
  )
  .join('\n')}

HUGE COMMITS (Large Changes):
${topHugeCommits
  .map(
    (h) =>
      `- ${h.commitHash.substring(0, 8)}: ${h.filesChanged} files, ${h.totalChanges} total changes (${h.linesAdded} added, ${h.linesRemoved} removed), ${h.author}, risk level: ${h.riskLevel}`
  )
  .join('\n')}

WIP COMMITS (Work in Progress):
${topWip
  .map(
    (w) =>
      `- ${w.commitHash.substring(0, 8)}: ${w.commitDate}, ${w.author}, keywords: ${w.wipKeywords.join(', ')}`
  )
  .join('\n')}

QUICK FIX COMMITS:
${topQuickFix
  .map(
    (q) =>
      `- ${q.commitHash.substring(0, 8)}: ${q.commitDate}, ${q.author}, keywords: ${q.quickFixKeywords.join(', ')}`
  )
  .join('\n')}

LARGE BINARY FILES:
${topBinary
  .map(
    (b) =>
      `- ${b.file}: ${b.sizeMB.toFixed(2)} MB, ${b.fileType}, ${b.commitDate}, risk level: ${b.riskLevel}`
  )
  .join('\n')}

VENDORED CODE GROWTH:
${topVendored
  .map(
    (v) =>
      `- ${v.directory}: ${v.growthPercentage.toFixed(1)}% growth, ${v.filesAdded} files added, risk level: ${v.riskLevel}`
  )
  .join('\n')}

LONG-LIVED BRANCHES:
${topBranches
  .map(
    (b) =>
      `- ${b.branchName}: ${b.daysSinceCreation} days old, ${b.commitCount} commits, ${b.isMerged ? 'merged' : 'unmerged'}, risk level: ${b.riskLevel}`
  )
  .join('\n')}

STALE DEPENDENCIES:
${topStale
  .map((s) => `- ${s.lockfile}: ${s.daysSinceUpdate} days since update, risk level: ${s.riskLevel}`)
  .join('\n')}

BRANCH PROLIFERATION:
- Total branches: ${data.branchProliferation.totalBranches}
- Active branches: ${data.branchProliferation.activeBranches}
- Unmerged branches: ${data.branchProliferation.unmergedBranches}
- Risk level: ${data.branchProliferation.riskLevel}

MISSING AUTOMATION:
- Dependency automation: ${data.missingAutomation.hasDependencyAutomation ? 'Yes' : 'No'}
- CI/CD automation: ${data.missingAutomation.hasCicdAutomation ? 'Yes' : 'No'}
- Risk level: ${data.missingAutomation.riskLevel}

Please provide:
1. **Technical Debt Assessment**: Overall health and debt level of the codebase
2. **Priority Debt Items**: Which indicators pose the highest risk and should be addressed first
3. **Debt Patterns**: Common patterns that indicate systemic issues
4. **Actionable Recommendations**: Specific steps to reduce technical debt
5. **Refactoring Roadmap**: Suggested order for addressing different types of debt

Focus on providing a clear, prioritized plan for reducing technical debt.`;
}
