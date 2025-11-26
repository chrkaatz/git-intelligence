import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  AreaChart,
  Line,
} from 'recharts';
import type { RepositoryEvolution as RepositoryEvolutionType } from '../api';
import { GitCommit, TrendingUp, Activity, RefreshCw, Tag, Zap } from 'lucide-react';

interface RepositoryEvolutionProps {
  evolution: RepositoryEvolutionType;
  loading?: boolean;
}

export function RepositoryEvolution({ evolution, loading }: RepositoryEvolutionProps) {
  const [selectedSection, setSelectedSection] = useState<
    'activity' | 'growth' | 'churn' | 'bursts' | 'releases'
  >('activity');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Summary Cards
  const summaryCards = [
    {
      title: 'Total Commits',
      value: evolution.totalCommits.toLocaleString(),
      icon: GitCommit,
      color: 'text-blue-500',
    },
    {
      title: 'Releases',
      value: evolution.totalReleases.toString(),
      icon: Tag,
      color: 'text-green-500',
    },
    {
      title: 'Avg Commits/Day',
      value: evolution.averageCommitsPerDay.toFixed(1),
      icon: Activity,
      color: 'text-purple-500',
    },
    {
      title: 'Refactors',
      value: evolution.refactorCount.toString(),
      icon: RefreshCw,
      color: 'text-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {summaryCards.map((card, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {card.title}
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                  {card.value}
                </p>
              </div>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Section Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-4">
        <button
          onClick={() => setSelectedSection('activity')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedSection === 'activity'
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          <Activity className="w-4 h-4 inline mr-2" />
          Commit Frequency
        </button>
        <button
          onClick={() => setSelectedSection('growth')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedSection === 'growth'
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          <TrendingUp className="w-4 h-4 inline mr-2" />
          Growth Curves
        </button>
        <button
          onClick={() => setSelectedSection('churn')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedSection === 'churn'
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          <RefreshCw className="w-4 h-4 inline mr-2" />
          Churn Metrics
        </button>
        <button
          onClick={() => setSelectedSection('bursts')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedSection === 'bursts'
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          <Zap className="w-4 h-4 inline mr-2" />
          Change Bursts
        </button>
        <button
          onClick={() => setSelectedSection('releases')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedSection === 'releases'
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          <Tag className="w-4 h-4 inline mr-2" />
          Releases
        </button>
      </div>

      {/* Commit Frequency Section */}
      {selectedSection === 'activity' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              Commit Frequency Over Time
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Number of commits per day, showing the activity pattern of the repository.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={evolution.commitFrequency}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-gray-300 dark:stroke-gray-700"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis
                  tick={{ fill: 'currentColor' }}
                  className="text-gray-600 dark:text-gray-400"
                />
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
                  name="Commits"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Growth Curves Section */}
      {selectedSection === 'growth' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Repository Growth Over Time
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Lines of code and file count growth showing how the repository has evolved.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={evolution.growthCurve}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-gray-300 dark:stroke-gray-700"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: 'currentColor' }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: 'currentColor' }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tw-color-gray-800)',
                    border: '1px solid var(--tw-color-gray-700)',
                    borderRadius: '0.5rem',
                  }}
                />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="loc"
                  fill="#10b981"
                  fillOpacity={0.3}
                  stroke="#10b981"
                  name="Lines of Code"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="files"
                  stroke="#3b82f6"
                  name="File Count"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Churn Metrics Section */}
      {selectedSection === 'churn' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-orange-500" />
              Churn Metrics - Additions vs Deletions
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Code additions and deletions over time. High churn indicates active refactoring or
              rapid changes.
            </p>
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Average Churn Ratio:</strong> {evolution.averageChurnRatio.toFixed(2)}
                <br />
                <span className="text-xs">
                  (Higher values indicate more simultaneous additions and deletions)
                </span>
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={evolution.churnMetrics}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-gray-300 dark:stroke-gray-700"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis
                  tick={{ fill: 'currentColor' }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tw-color-gray-800)',
                    border: '1px solid var(--tw-color-gray-700)',
                    borderRadius: '0.5rem',
                  }}
                />
                <Legend />
                <Bar dataKey="additions" fill="#10b981" name="Additions" />
                <Bar dataKey="deletions" fill="#ef4444" name="Deletions" />
                <Line
                  type="monotone"
                  dataKey="netChange"
                  stroke="#6366f1"
                  strokeWidth={2}
                  name="Net Change"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Change Bursts Section */}
      {selectedSection === 'bursts' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Change Bursts & Refactors
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Periods of high activity with significant code changes. Refactors are identified as
              large net-zero changes.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            {evolution.changeBursts.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={evolution.changeBursts.slice(-50)}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-gray-300 dark:stroke-gray-700"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'currentColor', fontSize: 12 }}
                      className="text-gray-600 dark:text-gray-400"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis
                      tick={{ fill: 'currentColor' }}
                      className="text-gray-600 dark:text-gray-400"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--tw-color-gray-800)',
                        border: '1px solid var(--tw-color-gray-700)',
                        borderRadius: '0.5rem',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="linesAdded" fill="#10b981" name="Lines Added" />
                    <Bar dataKey="linesRemoved" fill="#ef4444" name="Lines Removed" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Recent Change Bursts (showing refactors in orange)
                  </h4>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {evolution.changeBursts
                      .slice(-20)
                      .reverse()
                      .map((burst, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-3 rounded ${
                            burst.isRefactor
                              ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                              : 'bg-gray-50 dark:bg-gray-900'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {new Date(burst.date).toLocaleDateString()}
                              {burst.isRefactor && (
                                <span className="ml-2 text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded">
                                  Refactor
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              +{burst.linesAdded.toLocaleString()} / -
                              {burst.linesRemoved.toLocaleString()} (net:{' '}
                              {burst.netChange > 0 ? '+' : ''}
                              {burst.netChange.toLocaleString()})
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No change bursts detected.</p>
            )}
          </div>
        </div>
      )}

      {/* Releases Section */}
      {selectedSection === 'releases' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5 text-green-500" />
              Release Cadence
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Git tags showing release points in the repository history.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            {evolution.releases.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {evolution.releases.map((release, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Tag className="w-4 h-4 text-green-500" />
                            <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                              {release.tag}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            {new Date(release.date).toLocaleDateString()}
                          </div>
                          {release.message && (
                            <div className="text-xs text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                              {release.message}
                            </div>
                          )}
                          <div className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-2">
                            {release.commitHash.substring(0, 7)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                No releases (tags) found in this repository.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
