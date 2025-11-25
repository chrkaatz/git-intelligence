import { useState } from 'react';
import { LineChart, Line, ComposedChart, Area, AreaChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { CrossRepoRepositoryEvolution as CrossRepoRepositoryEvolutionType } from '../api';
import { GitBranch, Activity, TrendingUp, RefreshCw, Zap, Tag, Link2 } from 'lucide-react';

interface CrossRepoRepositoryEvolutionProps {
  evolution: CrossRepoRepositoryEvolutionType;
  loading?: boolean;
}

export function CrossRepoRepositoryEvolution({ evolution, loading }: CrossRepoRepositoryEvolutionProps) {
  const [selectedSection, setSelectedSection] = useState<'overview' | 'synchronization' | 'repos'>('overview');
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!evolution || evolution.totalRepos === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No repository data available.
      </div>
    );
  }

  // Aggregate metrics across all repos
  const totalCommits = evolution.repositories.reduce((sum, r) => sum + r.evolution.totalCommits, 0);
  const totalReleases = evolution.repositories.reduce((sum, r) => sum + r.evolution.totalReleases, 0);
  const totalRefactors = evolution.repositories.reduce((sum, r) => sum + r.evolution.refactorCount, 0);
  const avgCommitsPerDay = evolution.repositories.reduce((sum, r) => sum + r.evolution.averageCommitsPerDay, 0) / evolution.repositories.length;

  // Prepare synchronization data
  const syncData = evolution.synchronization.map(sync => ({
    date: sync.date,
    repoCount: sync.repos.length,
    repos: sync.repos,
    totalCommits: Object.values(sync.commitCounts).reduce((sum, count) => sum + count, 0),
  }));

  // Prepare aggregated commit frequency (sum across all repos)
  const commitFreqMap = new Map<string, number>();
  evolution.repositories.forEach(repo => {
    repo.evolution.commitFrequency.forEach(cf => {
      commitFreqMap.set(cf.date, (commitFreqMap.get(cf.date) || 0) + cf.commits);
    });
  });
  const aggregatedCommitFrequency = Array.from(commitFreqMap.entries())
    .map(([date, commits]) => ({ date, commits }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Repositories</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{evolution.totalRepos}</p>
            </div>
            <GitBranch className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Commits</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{totalCommits.toLocaleString()}</p>
            </div>
            <Activity className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Releases</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{totalReleases}</p>
            </div>
            <Tag className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Refactors</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{totalRefactors}</p>
            </div>
            <RefreshCw className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-4">
        <button
          onClick={() => setSelectedSection('overview')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedSection === 'overview'
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}>
          <TrendingUp className="w-4 h-4 inline mr-2" />
          Overview
        </button>
        <button
          onClick={() => setSelectedSection('synchronization')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedSection === 'synchronization'
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}>
          <Link2 className="w-4 h-4 inline mr-2" />
          Synchronization
        </button>
        <button
          onClick={() => setSelectedSection('repos')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedSection === 'repos'
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}>
          <GitBranch className="w-4 h-4 inline mr-2" />
          Per-Repository
        </button>
      </div>

      {/* Overview Section */}
      {selectedSection === 'overview' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              Aggregated Commit Frequency Across All Repositories
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Combined commit activity across all repositories in this project.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={aggregatedCommitFrequency}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis tick={{ fill: 'currentColor' }} className="text-gray-600 dark:text-gray-400" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tw-color-gray-800)',
                    border: '1px solid var(--tw-color-gray-700)',
                    borderRadius: '0.5rem',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="commits"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.3}
                  name="Total Commits"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Synchronization Section */}
      {selectedSection === 'synchronization' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-blue-500" />
              Repository Synchronization
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Dates when multiple repositories had commits, showing which repos evolve in parallel.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            {syncData.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={syncData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'currentColor', fontSize: 12 }}
                      className="text-gray-600 dark:text-gray-400"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis tick={{ fill: 'currentColor' }} className="text-gray-600 dark:text-gray-400" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--tw-color-gray-800)',
                        border: '1px solid var(--tw-color-gray-700)',
                        borderRadius: '0.5rem',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="repoCount" fill="#6366f1" name="Repos Active" />
                    <Bar dataKey="totalCommits" fill="#10b981" name="Total Commits" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Synchronization Events (dates with multiple repos active)
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {syncData.slice(-30).reverse().map((sync, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {new Date(sync.date).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {sync.repoCount} repositories active, {sync.totalCommits} total commits
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {sync.repos.map((repo, rIdx) => (
                            <span
                              key={rIdx}
                              className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded">
                              {repo}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                No synchronization events found. Repositories may not be evolving in parallel.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Per-Repository Section */}
      {selectedSection === 'repos' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-purple-500" />
              Per-Repository Evolution Metrics
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Click on a repository to view its detailed evolution metrics.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Repository List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Repositories</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {evolution.repositories.map((repo, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedRepo(selectedRepo === repo.repoName ? null : repo.repoName)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedRepo === repo.repoName
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700'
                        : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}>
                    <div className="font-medium text-gray-900 dark:text-white">{repo.repoName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {repo.evolution.totalCommits} commits, {repo.evolution.totalReleases} releases
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Repository Details */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              {selectedRepo ? (
                (() => {
                  const repo = evolution.repositories.find(r => r.repoName === selectedRepo);
                  if (!repo) return null;
                  return (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">{repo.repoName}</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
                          <div className="text-xs text-gray-500 dark:text-gray-400">Commits</div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {repo.evolution.totalCommits.toLocaleString()}
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
                          <div className="text-xs text-gray-500 dark:text-gray-400">Releases</div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {repo.evolution.totalReleases}
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
                          <div className="text-xs text-gray-500 dark:text-gray-400">Avg Commits/Day</div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {repo.evolution.averageCommitsPerDay.toFixed(1)}
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
                          <div className="text-xs text-gray-500 dark:text-gray-400">Refactors</div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {repo.evolution.refactorCount}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Commit Frequency (Last 30 days)
                        </h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <AreaChart data={repo.evolution.commitFrequency.slice(-30)}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
                            <XAxis
                              dataKey="date"
                              tick={{ fill: 'currentColor', fontSize: 10 }}
                              className="text-gray-600 dark:text-gray-400"
                            />
                            <YAxis tick={{ fill: 'currentColor', fontSize: 10 }} className="text-gray-600 dark:text-gray-400" />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'var(--tw-color-gray-800)',
                                border: '1px solid var(--tw-color-gray-700)',
                                borderRadius: '0.5rem',
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="commits"
                              stroke="#6366f1"
                              fill="#6366f1"
                              fillOpacity={0.3}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Select a repository to view its evolution metrics
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

