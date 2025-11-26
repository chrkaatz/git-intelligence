import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import {
  getCrossRepoDeveloperAnalytics,
  getCrossRepoRepositoryEvolution,
  getCrossRepoCodebaseHealth,
  getCrossRepoBusFactorAndOwnership,
  getCrossRepoSocialNetworkAnalysis,
  type CrossRepoDeveloperAnalytics,
  type CrossRepoRepositoryEvolution,
  type CrossRepoCodebaseHealth,
  type CrossRepoBusFactorAndOwnership,
  type CrossRepoSocialNetworkAnalysis,
} from '../../api';
import {
  Activity,
  AlertCircle,
  GitBranch,
  GitCommit,
  Group,
  Network,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { useNotifications } from '../../context/NotificationContext';

type LoadedData = {
  devAnalytics: CrossRepoDeveloperAnalytics | null;
  evolution: CrossRepoRepositoryEvolution | null;
  health: CrossRepoCodebaseHealth | null;
  busFactor: CrossRepoBusFactorAndOwnership | null;
  social: CrossRepoSocialNetworkAnalysis | null;
};

export function CrossRepoAnalyticsPortfolioView() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params?.projectId;

  const [data, setData] = useState<LoadedData>({
    devAnalytics: null,
    evolution: null,
    health: null,
    busFactor: null,
    social: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showNotification, removeNotification } = useNotifications();
  const loadingNotificationIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setData({
        devAnalytics: null,
        evolution: null,
        health: null,
        busFactor: null,
        social: null,
      });
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchAll = async () => {
      setLoading(true);
      setError(null);

      const loadingId = showNotification(
        'loading',
        'Calculating cross-repository portfolio analytics... This may take a moment.',
        0
      );
      loadingNotificationIdRef.current = loadingId;

      try {
        const [devAnalytics, evolution, health, busFactor, social] = await Promise.all([
          getCrossRepoDeveloperAnalytics(projectId),
          getCrossRepoRepositoryEvolution(projectId),
          getCrossRepoCodebaseHealth(projectId),
          getCrossRepoBusFactorAndOwnership(projectId),
          getCrossRepoSocialNetworkAnalysis(projectId),
        ]);

        if (cancelled) return;

        setData({
          devAnalytics,
          evolution,
          health,
          busFactor,
          social,
        });

        if (loadingNotificationIdRef.current) {
          removeNotification(loadingNotificationIdRef.current);
          loadingNotificationIdRef.current = null;
        }
        showNotification(
          'success',
          `Cross-repository portfolio analytics calculated for ${devAnalytics.totalRepos} repositories.`,
          3000
        );
      } catch (err: unknown) {
        if (cancelled) return;
        const errorMessage =
          (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data
            ?.error ||
          (err as { message?: string })?.message ||
          'Failed to load cross-repository portfolio analytics';
        setError(errorMessage);

        if (loadingNotificationIdRef.current) {
          removeNotification(loadingNotificationIdRef.current);
          loadingNotificationIdRef.current = null;
        }
        showNotification('error', errorMessage, 5000);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchAll();

    return () => {
      cancelled = true;
    };
  }, [projectId, showNotification, removeNotification]);

  const overallActivityData = useMemo(() => {
    if (!data.evolution) return { series: [], recentTotal: 0, previousTotal: 0, trend: 0 };

    const commitFreqMap = new Map<string, number>();
    data.evolution.repositories.forEach((repo) => {
      repo.evolution.commitFrequency.forEach((cf) => {
        commitFreqMap.set(cf.date, (commitFreqMap.get(cf.date) || 0) + cf.commits);
      });
    });

    const series = Array.from(commitFreqMap.entries())
      .map(([date, commits]) => ({ date, commits }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const daysWindow = 30;
    const now = series.length > 0 ? new Date(series[series.length - 1].date) : new Date();

    const sumInWindow = (startOffset: number, endOffset: number) => {
      const start = new Date(now);
      start.setDate(start.getDate() - startOffset);
      const end = new Date(now);
      end.setDate(end.getDate() - endOffset);

      return series
        .filter((p) => {
          const d = new Date(p.date);
          return d >= end && d <= start;
        })
        .reduce((sum, p) => sum + p.commits, 0);
    };

    const recentTotal = sumInWindow(0, daysWindow);
    const previousTotal = sumInWindow(daysWindow, 2 * daysWindow);
    const trend =
      previousTotal === 0
        ? recentTotal > 0
          ? 100
          : 0
        : ((recentTotal - previousTotal) / previousTotal) * 100;

    return { series, recentTotal, previousTotal, trend };
  }, [data.evolution]);

  const portfolioInsights = useMemo(() => {
    const repos =
      data.evolution?.repositories.map((r) => ({
        name: r.repoName,
        path: r.repoPath,
        totalCommits: r.evolution.totalCommits,
        avgChurnRatio: r.evolution.averageChurnRatio,
        commitFrequency: r.evolution.commitFrequency,
      })) ?? [];

    const now = new Date();
    const daysStagnantThreshold = 90;

    const repoActivitySummary = repos.map((r) => {
      const sortedFreq = [...r.commitFrequency].sort((a, b) => a.date.localeCompare(b.date));
      const lastCommitDate =
        sortedFreq.length > 0 ? new Date(sortedFreq[sortedFreq.length - 1].date) : null;
      const daysSinceLastCommit =
        lastCommitDate != null
          ? Math.floor((now.getTime() - lastCommitDate.getTime()) / (1000 * 60 * 60 * 24))
          : null;

      const recentCommits = sortedFreq
        .filter((cf) => {
          const d = new Date(cf.date);
          const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays <= daysStagnantThreshold;
        })
        .reduce((sum, cf) => sum + cf.commits, 0);

      return {
        ...r,
        daysSinceLastCommit,
        recentCommits,
      };
    });

    const projectsMostTime = [...repoActivitySummary]
      .sort((a, b) => b.totalCommits - a.totalCommits)
      .slice(0, 5);

    const mostUnstable = [...repoActivitySummary]
      .filter((r) => Number.isFinite(r.avgChurnRatio))
      .sort((a, b) => b.avgChurnRatio - a.avgChurnRatio)
      .slice(0, 5);

    const stagnant = repoActivitySummary
      .filter(
        (r) => (r.daysSinceLastCommit ?? Infinity) >= daysStagnantThreshold || r.recentCommits === 0
      )
      .sort((a, b) => (b.daysSinceLastCommit ?? 0) - (a.daysSinceLastCommit ?? 0))
      .slice(0, 5);

    const topActivityBar = projectsMostTime.map((r) => ({
      repo: r.name,
      commits: r.totalCommits,
    }));

    return {
      projectsMostTime,
      mostUnstable,
      stagnant,
      topActivityBar,
    };
  }, [data.evolution]);

  const orgInsights = useMemo(() => {
    const authors = data.devAnalytics?.authors ?? [];
    const overloadedContributors = [...authors]
      .filter((a) => a.repoCount > 2 && a.commits > 50)
      .sort((a, b) => b.commits - a.commits)
      .slice(0, 5);

    const repoClusters = data.social?.repoClusters ?? [];

    const overloadedData = overloadedContributors.map((a) => ({
      name: a.name.length > 18 ? `${a.name.slice(0, 18)}…` : a.name,
      commits: a.commits,
      repoCount: a.repoCount,
    }));

    return {
      overloadedContributors,
      overloadedData,
      repoClusters,
    };
  }, [data.devAnalytics, data.social]);

  const architectureInsights = useMemo(() => {
    const syncEvents = data.evolution?.synchronization ?? [];

    type PairKey = string;
    const pairCounts = new Map<PairKey, { repos: [string, string]; count: number }>();

    syncEvents.forEach((event) => {
      const repos = [...event.repos].sort();
      for (let i = 0; i < repos.length; i++) {
        for (let j = i + 1; j < repos.length; j++) {
          const pair: [string, string] = [repos[i]!, repos[j]!];
          const key = `${pair[0]}||${pair[1]}`;
          const existing = pairCounts.get(key);
          if (existing) {
            existing.count += 1;
          } else {
            pairCounts.set(key, { repos: pair, count: 1 });
          }
        }
      }
    });

    const coEvolvedPairs = Array.from(pairCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const churnConcentration = (data.evolution?.repositories ?? [])
      .map((r) => ({
        name: r.repoName,
        avgChurnRatio: r.evolution.averageChurnRatio,
      }))
      .sort((a, b) => b.avgChurnRatio - a.avgChurnRatio)
      .slice(0, 5);

    const syncSummary = syncEvents.length;

    return {
      coEvolvedPairs,
      churnConcentration,
      syncSummary,
    };
  }, [data.evolution]);

  if (!projectId) {
    return (
      <div className="text-center py-12 text-gray-500">
        Select a project to view cross-repository portfolio analytics.
      </div>
    );
  }

  if (loading && !data.devAnalytics && !data.evolution) {
    return (
      <div className="flex items-center justify-center h-96">
        <Activity className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Cross-Repository Portfolio Analytics
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Aggregated view of engineering activity, organizational patterns, and architecture signals
          across all repositories in this project.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {data.devAnalytics && (
        <section aria-label="Portfolio summary" className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-indigo-500" />
            Portfolio-Level View
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Repositories
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {data.devAnalytics.totalRepos}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Developers
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {data.devAnalytics.authors.length}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Total Commits
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {data.devAnalytics.authors.reduce((sum, a) => sum + a.commits, 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Activity Trend (30d vs previous)
              </p>
              <div className="mt-1 flex items-center gap-2">
                {overallActivityData.trend >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <p
                  className={`text-lg font-semibold ${
                    overallActivityData.trend >= 0 ? 'text-emerald-500' : 'text-red-500'
                  }`}
                >
                  {Number.isFinite(overallActivityData.trend)
                    ? `${overallActivityData.trend.toFixed(1)}%`
                    : '—'}
                </p>
              </div>
            </div>
          </div>

          {overallActivityData.series.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-500" />
                    Overall Engineering Activity Trend
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Organization-wide commit volume aggregated across all repositories.
                  </p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={overallActivityData.series}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-gray-300 dark:stroke-gray-700"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'currentColor', fontSize: 11 }}
                    className="text-gray-600 dark:text-gray-400"
                    angle={-45}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis
                    tick={{ fill: 'currentColor', fontSize: 11 }}
                    className="text-gray-600 dark:text-gray-400"
                  />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="commits"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.25}
                    name="Commits"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {portfolioInsights.topActivityBar.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
                <GitCommit className="w-4 h-4 text-blue-500" />
                Projects Consuming the Most Engineering Time
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Repositories ranked by total commit volume.
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={portfolioInsights.topActivityBar}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-gray-300 dark:stroke-gray-700"
                  />
                  <XAxis
                    dataKey="repo"
                    tick={{ fill: 'currentColor', fontSize: 11 }}
                    className="text-gray-600 dark:text-gray-400"
                  />
                  <YAxis
                    tick={{ fill: 'currentColor', fontSize: 11 }}
                    className="text-gray-600 dark:text-gray-400"
                  />
                  <Tooltip />
                  <Bar dataKey="commits" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      )}

      <section aria-label="Org level insights" className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-500" />
          Org-Level Insights
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                Overloaded Contributors
              </h3>
            </div>
            {orgInsights.overloadedContributors.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No obviously overloaded contributors detected across repositories.
              </p>
            ) : (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Developers with high commit volume spread across many repositories.
                </p>
                <div className="mb-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={orgInsights.overloadedData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-gray-300 dark:stroke-gray-700"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: 'currentColor', fontSize: 11 }}
                        className="text-gray-600 dark:text-gray-400"
                      />
                      <YAxis
                        tick={{ fill: 'currentColor', fontSize: 11 }}
                        className="text-gray-600 dark:text-gray-400"
                      />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="commits" fill="#6366f1" name="Commits" />
                      <Bar dataKey="repoCount" fill="#22c55e" name="Repos" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-2 text-sm">
                  {orgInsights.overloadedContributors.map((author) => (
                    <li
                      key={author.email}
                      className="flex items-center justify-between text-gray-700 dark:text-gray-200"
                    >
                      <span className="truncate max-w-[50%]">{author.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {author.commits.toLocaleString()} commits across {author.repoCount} repos
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Group className="w-4 h-4 text-purple-500" />
                Natural Team Boundaries
              </h3>
            </div>
            {orgInsights.repoClusters.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No collaboration clusters detected yet. Add more repositories and commit history to
                reveal cross-repo teams.
              </p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {orgInsights.repoClusters.map((cluster) => (
                  <div
                    key={cluster.clusterId}
                    className="border border-gray-200 dark:border-gray-700 rounded-md p-3 bg-gray-50 dark:bg-gray-900"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Cluster #{cluster.clusterId}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {cluster.repos.length} repos, {cluster.authors.length} contributors
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Repos:</span>{' '}
                      {cluster.repos.slice(0, 5).join(', ')}
                      {cluster.repos.length > 5 && '…'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section aria-label="Architecture insights" className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Network className="w-5 h-5 text-blue-500" />
          Architecture Insights
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
              <GitBranch className="w-4 h-4 text-blue-500" />
              Components Most Frequently Co-Evolved
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Repository pairs that tend to change together, indicating tight coupling.
            </p>
            {architectureInsights.coEvolvedPairs.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No co-evolution patterns detected across repositories yet.
              </p>
            ) : (
              <ul className="space-y-2 text-sm max-h-64 overflow-y-auto">
                {architectureInsights.coEvolvedPairs.map((pair, idx) => (
                  <li
                    key={`${pair.repos[0]}-${pair.repos[1]}-${idx}`}
                    className="flex items-center justify-between text-gray-700 dark:text-gray-200"
                  >
                    <span className="truncate max-w-[60%]">
                      {pair.repos[0]} &nbsp;↔&nbsp; {pair.repos[1]}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {pair.count} synchronized days
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div>
              <h3 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-red-500" />
                Churn Concentration
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Repositories with the highest average churn ratios.
              </p>
              {architectureInsights.churnConcentration.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                  Churn data is not available yet.
                </p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {architectureInsights.churnConcentration.map((repo) => (
                    <li
                      key={repo.name}
                      className="flex items-center justify-between text-gray-700 dark:text-gray-200"
                    >
                      <span className="truncate max-w-[60%]">{repo.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Avg churn ratio: {repo.avgChurnRatio.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
                <GitCommit className="w-4 h-4 text-indigo-500" />
                Synchronization Patterns
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Number of dates where multiple repositories were active.
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {architectureInsights.syncSummary}
              </p>
            </div>
          </div>
        </div>
      </section>

      {portfolioInsights.mostUnstable.length > 0 || portfolioInsights.stagnant.length > 0 ? (
        <section aria-label="Stability and maintenance" className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Stability & Maintenance
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {portfolioInsights.mostUnstable.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-2">
                  Most Unstable Repositories
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Repositories with the highest churn ratios.
                </p>
                <ul className="space-y-2 text-sm">
                  {portfolioInsights.mostUnstable.map((r) => (
                    <li
                      key={r.name}
                      className="flex items-center justify-between text-gray-700 dark:text-gray-200"
                    >
                      <span className="truncate max-w-[60%]">{r.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Avg churn ratio: {r.avgChurnRatio.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {portfolioInsights.stagnant.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-2">
                  Dying or Stagnant Repositories
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Repositories with little or no recent activity (last 90 days).
                </p>
                <ul className="space-y-2 text-sm">
                  {portfolioInsights.stagnant.map((r) => (
                    <li
                      key={r.name}
                      className="flex items-center justify-between text-gray-700 dark:text-gray-200"
                    >
                      <span className="truncate max-w-[60%]">{r.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {r.daysSinceLastCommit != null
                          ? `${r.daysSinceLastCommit}d since last commit`
                          : 'No commits recorded'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
