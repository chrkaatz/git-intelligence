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
import type { BusFactorAndOwnership as BusFactorAndOwnershipType } from '../../api';
import { getRiskColor, getRiskLabel } from '../common/riskUtils';
import { AlertTriangle, Users, UserX, TrendingDown } from 'lucide-react';

interface BusFactorAndOwnershipProps {
  singleMaintainerRisk: BusFactorAndOwnershipType['singleMaintainerRisk'];
  fragmentation: BusFactorAndOwnershipType['fragmentation'];
  ownerChurn: BusFactorAndOwnershipType['ownerChurn'];
}

export function BusFactorAndOwnership({
  singleMaintainerRisk,
  fragmentation,
  ownerChurn,
}: BusFactorAndOwnershipProps) {
  const [selectedSection, setSelectedSection] = useState<
    'single-maintainer' | 'fragmentation' | 'owner-churn'
  >('single-maintainer');

  return (
    <div className="space-y-6">
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
              Single-Maintainer Risk
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Files and repositories maintained mostly by one person, indicating high bus factor
              risk.
            </p>
          </div>

          {/* Repo-level risk */}
          {singleMaintainerRisk.repoRisk && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Repository-Level Risk
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div
                  className={`rounded-lg border p-4 ${
                    singleMaintainerRisk.repoRisk.riskLevel === 'high'
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      : singleMaintainerRisk.repoRisk.riskLevel === 'medium'
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                        : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle
                      className={`w-5 h-5 ${
                        singleMaintainerRisk.repoRisk.riskLevel === 'high'
                          ? 'text-red-600 dark:text-red-400'
                          : singleMaintainerRisk.repoRisk.riskLevel === 'medium'
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-green-600 dark:text-green-400'
                      }`}
                    />
                    <h4 className="font-medium text-gray-900 dark:text-white">Risk Level</h4>
                  </div>
                  <p
                    className={`text-2xl font-bold ${
                      singleMaintainerRisk.repoRisk.riskLevel === 'high'
                        ? 'text-red-600 dark:text-red-400'
                        : singleMaintainerRisk.repoRisk.riskLevel === 'medium'
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-green-600 dark:text-green-400'
                    }`}
                  >
                    {getRiskLabel(singleMaintainerRisk.repoRisk.riskLevel)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Primary Maintainer
                  </h4>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {singleMaintainerRisk.repoRisk.primaryAuthor}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {singleMaintainerRisk.repoRisk.primaryAuthorEmail}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    {singleMaintainerRisk.repoRisk.ownershipPercentage.toFixed(1)}% ownership (
                    {singleMaintainerRisk.repoRisk.primaryAuthorCommits} of{' '}
                    {singleMaintainerRisk.repoRisk.totalCommits} commits)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* File-level risk */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              File-Level Risk
            </h3>
            {singleMaintainerRisk.files.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={singleMaintainerRisk.files.slice(0, 20)}>
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
                      formatter={(value, name) => {
                        if (name === 'ownershipPercentage') {
                          const num = typeof value === 'number' ? value : Number(value) || 0;
                          return [`${num.toFixed(1)}%`, 'Ownership'];
                        }
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="ownershipPercentage" name="Ownership %" fill="#f97316">
                      {singleMaintainerRisk.files.slice(0, 20).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getRiskColor(entry.riskLevel)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <div className="mt-4">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                    Top Risk Files
                  </h4>
                  <div className="space-y-2">
                    {singleMaintainerRisk.files.slice(0, 10).map((file, index) => (
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
                </div>
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
              Fragmentation
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Files with too many authors modifying them, indicating coordination bottlenecks.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Fragmented Files
            </h3>
            {fragmentation.files.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={fragmentation.files.slice(0, 20)}>
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
                      {fragmentation.files.slice(0, 20).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getRiskColor(entry.riskLevel)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <div className="mt-4">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                    Top Fragmented Files
                  </h4>
                  <div className="space-y-2">
                    {fragmentation.files.slice(0, 10).map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono text-gray-900 dark:text-white truncate">
                            {file.file}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {file.totalCommits} total commits
                          </p>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {file.authorCount} authors
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              ~{file.averageCommitsPerAuthor.toFixed(1)} commits/author
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
              Owner Churn
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Files where ownership has changed from one maintainer to another, indicating potential
              knowledge loss risk.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Files with Owner Churn
            </h3>
            {ownerChurn.files.length > 0 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  {ownerChurn.files.slice(0, 20).map((file, index) => (
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
                            Last commit:{' '}
                            {new Date(file.previousOwnerLastCommit).toLocaleDateString()}
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
