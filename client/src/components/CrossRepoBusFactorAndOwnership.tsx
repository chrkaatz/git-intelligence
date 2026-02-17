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
  Cell,
} from 'recharts';
import type { CrossRepoBusFactorAndOwnership as CrossRepoBusFactorAndOwnershipType } from '../api';
import { getRiskColor, getRiskLabel } from './common/riskUtils';
import { UserX, Users, TrendingDown, GitBranch } from 'lucide-react';

interface CrossRepoBusFactorAndOwnershipProps {
  analytics: CrossRepoBusFactorAndOwnershipType;
  loading?: boolean;
}

export function CrossRepoBusFactorAndOwnership({
  analytics,
  loading,
}: CrossRepoBusFactorAndOwnershipProps) {
  const [selectedSection, setSelectedSection] = useState<
    'single-maintainer' | 'fragmentation' | 'owner-churn'
  >('single-maintainer');
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!analytics || analytics.totalRepos === 0) {
    return <div className="text-center py-12 text-gray-500">No repository data available.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Repositories
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {analytics.totalRepos}
              </p>
            </div>
            <GitBranch className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Single-Maintainer Repos
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {
                  analytics.singleMaintainerRisk.repositories.filter(
                    (r) => r.riskLevel === 'high' || r.riskLevel === 'medium'
                  ).length
                }
              </p>
            </div>
            <UserX className="w-6 h-6 text-orange-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Fragmented Files
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {analytics.fragmentation.aggregatedFiles.length}
              </p>
            </div>
            <Users className="w-6 h-6 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Owner Churn Files
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {analytics.ownerChurn.aggregatedFiles.length}
              </p>
            </div>
            <TrendingDown className="w-6 h-6 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-4">
        <button
          onClick={() => setSelectedSection('single-maintainer')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedSection === 'single-maintainer'
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          <UserX className="w-4 h-4 inline mr-2" />
          Single-Maintainer Risk
        </button>
        <button
          onClick={() => setSelectedSection('fragmentation')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedSection === 'fragmentation'
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Fragmentation
        </button>
        <button
          onClick={() => setSelectedSection('owner-churn')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedSection === 'owner-churn'
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          <TrendingDown className="w-4 h-4 inline mr-2" />
          Owner Churn
        </button>
      </div>

      {/* Single-Maintainer Risk Section */}
      {selectedSection === 'single-maintainer' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <UserX className="w-5 h-5 text-orange-500" />
              Single-Maintainer Risk Across Repositories
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Repositories and files maintained mostly by one person, indicating high bus factor
              risk.
            </p>
          </div>

          {/* Repository-level risk */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Repository-Level Risk
            </h3>
            {analytics.singleMaintainerRisk.repositories.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analytics.singleMaintainerRisk.repositories.slice(0, 20)}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-gray-300 dark:stroke-gray-700"
                    />
                    <XAxis
                      dataKey="repoName"
                      angle={-45}
                      textAnchor="end"
                      height={120}
                      tick={{ fill: 'currentColor', fontSize: 12 }}
                      className="text-gray-600 dark:text-gray-400"
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
                      formatter={(value: number | undefined) => [
                        `${(value ?? 0).toFixed(1)}%`,
                        'Ownership',
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="ownershipPercentage" name="Ownership %" fill="#f97316">
                      {analytics.singleMaintainerRisk.repositories
                        .slice(0, 20)
                        .map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getRiskColor(entry.riskLevel)} />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <div className="mt-4">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                    Repository Rankings
                  </h4>
                  <div className="space-y-2">
                    {analytics.singleMaintainerRisk.repositories.slice(0, 10).map((repo, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedRepo === repo.repoName
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700'
                            : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                        onClick={() =>
                          setSelectedRepo(selectedRepo === repo.repoName ? null : repo.repoName)
                        }
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {repo.repoName}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {repo.primaryAuthor} ({repo.primaryAuthorEmail})
                          </p>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {repo.ownershipPercentage.toFixed(1)}%
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              {repo.primaryAuthorCommits} / {repo.totalCommits} commits
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              repo.riskLevel === 'high'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                : repo.riskLevel === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            }`}
                          >
                            {getRiskLabel(repo.riskLevel)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                No single-maintainer risk repositories found.
              </p>
            )}
          </div>

          {/* Aggregated file-level risk */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Top Risk Files Across All Repositories
            </h3>
            {analytics.singleMaintainerRisk.aggregatedFiles.length > 0 ? (
              <div className="space-y-2">
                {analytics.singleMaintainerRisk.aggregatedFiles.slice(0, 20).map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-gray-900 dark:text-white truncate">
                        {file.file}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {file.primaryAuthor} ({file.primaryAuthorEmail})
                      </p>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {file.ownershipPercentage.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {file.primaryAuthorCommits} / {file.totalCommits} commits
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          file.riskLevel === 'high'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : file.riskLevel === 'medium'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        }`}
                      >
                        {getRiskLabel(file.riskLevel)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                No single-maintainer risk files found.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Fragmentation Section */}
      {selectedSection === 'fragmentation' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Fragmentation Across Repositories
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Files with too many authors modifying them, indicating coordination bottlenecks.
            </p>
          </div>

          {/* Repository breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Fragmentation by Repository
            </h3>
            {analytics.fragmentation.repositories.length > 0 ? (
              <div className="space-y-4">
                {analytics.fragmentation.repositories.map((repo, idx) => (
                  <div
                    key={idx}
                    className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0 last:pb-0"
                  >
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">
                      {repo.repoName}
                    </h4>
                    <div className="space-y-2">
                      {repo.fragmentedFiles.slice(0, 5).map((file, fileIdx) => (
                        <div
                          key={fileIdx}
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-mono text-gray-900 dark:text-white truncate">
                              {file.file}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            <div className="text-right">
                              <p className="text-xs font-semibold text-gray-900 dark:text-white">
                                {file.authorCount} authors
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                file.riskLevel === 'high'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                  : file.riskLevel === 'medium'
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              }`}
                            >
                              {getRiskLabel(file.riskLevel)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No fragmented files found.</p>
            )}
          </div>

          {/* Aggregated files */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Top Fragmented Files Across All Repositories
            </h3>
            {analytics.fragmentation.aggregatedFiles.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analytics.fragmentation.aggregatedFiles.slice(0, 20)}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-gray-300 dark:stroke-gray-700"
                    />
                    <XAxis
                      dataKey="file"
                      angle={-45}
                      textAnchor="end"
                      height={120}
                      tick={{ fill: 'currentColor', fontSize: 12 }}
                      className="text-gray-600 dark:text-gray-400"
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
                    <Bar dataKey="authorCount" name="Number of Authors" fill="#3b82f6">
                      {analytics.fragmentation.aggregatedFiles.slice(0, 20).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getRiskColor(entry.riskLevel)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No fragmented files found.</p>
            )}
          </div>
        </div>
      )}

      {/* Owner Churn Section */}
      {selectedSection === 'owner-churn' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-purple-500" />
              Owner Churn Across Repositories
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Files where ownership has changed from one maintainer to another, indicating potential
              knowledge loss risk.
            </p>
          </div>

          {/* Repository breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Owner Churn by Repository
            </h3>
            {analytics.ownerChurn.repositories.length > 0 ? (
              <div className="space-y-4">
                {analytics.ownerChurn.repositories.map((repo, idx) => (
                  <div
                    key={idx}
                    className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0 last:pb-0"
                  >
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">
                      {repo.repoName}
                    </h4>
                    <div className="space-y-2">
                      {repo.churnFiles.slice(0, 5).map((file, fileIdx) => (
                        <div
                          key={fileIdx}
                          className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                        >
                          <p className="text-xs font-mono text-gray-900 dark:text-white truncate mb-2">
                            {file.file}
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-gray-600 dark:text-gray-400">
                                Previous: {file.previousOwner}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600 dark:text-gray-400">
                                Current: {file.currentOwner}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            Gap: {file.daysSinceTransition} days
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No owner churn detected.</p>
            )}
          </div>

          {/* Aggregated files */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Top Owner Churn Files Across All Repositories
            </h3>
            {analytics.ownerChurn.aggregatedFiles.length > 0 ? (
              <div className="space-y-2">
                {analytics.ownerChurn.aggregatedFiles.slice(0, 20).map((file, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono text-gray-900 dark:text-white truncate">
                          {file.file}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ml-4 ${
                          file.riskLevel === 'high'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : file.riskLevel === 'medium'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        }`}
                      >
                        {getRiskLabel(file.riskLevel)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
                        <p className="text-xs font-medium text-red-900 dark:text-red-300 mb-1">
                          Previous Owner
                        </p>
                        <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                          {file.previousOwner}
                        </p>
                        <p className="text-xs text-red-700 dark:text-red-400">
                          {file.previousOwnerEmail}
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                          Last commit: {new Date(file.previousOwnerLastCommit).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                        <p className="text-xs font-medium text-green-900 dark:text-green-300 mb-1">
                          Current Owner
                        </p>
                        <p className="text-sm font-semibold text-green-900 dark:text-green-200">
                          {file.currentOwner}
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-400">
                          {file.currentOwnerEmail}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                          First commit:{' '}
                          {new Date(file.currentOwnerFirstCommit).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Transition gap:{' '}
                        <span className="font-semibold">{file.daysSinceTransition} days</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No owner churn detected.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
