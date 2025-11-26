import type { CrossRepoTechnicalDebtIndicators as CrossRepoTechnicalDebtIndicatorsType } from '../api';
import { GitBranch, AlertTriangle, Zap, FileArchive, Package, Wrench } from 'lucide-react';

interface CrossRepoTechnicalDebtIndicatorsProps {
  indicators: CrossRepoTechnicalDebtIndicatorsType;
  loading?: boolean;
}

export function CrossRepoTechnicalDebtIndicators({
  indicators,
  loading,
}: CrossRepoTechnicalDebtIndicatorsProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!indicators || indicators.totalRepos === 0) {
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
                {indicators.totalRepos}
              </p>
            </div>
            <GitBranch className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Huge Commits
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {indicators.aggregated.totalHugeCommits}
              </p>
            </div>
            <GitBranch className="w-6 h-6 text-orange-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                WIP Commits
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {indicators.aggregated.totalWipCommits}
              </p>
            </div>
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Quick Fixes
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {indicators.aggregated.totalQuickFixCommits}
              </p>
            </div>
            <Zap className="w-6 h-6 text-orange-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Binary Files
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {indicators.aggregated.totalLargeBinaryFiles}
              </p>
            </div>
            <FileArchive className="w-6 h-6 text-purple-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Long-Lived Branches
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {indicators.aggregated.totalLongLivedBranches}
              </p>
            </div>
            <GitBranch className="w-6 h-6 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Stale Deps
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {indicators.aggregated.reposWithStaleDependencies}
              </p>
            </div>
            <Package className="w-6 h-6 text-indigo-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                No CI/CD
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {indicators.aggregated.reposWithoutCicdAutomation}
              </p>
            </div>
            <Wrench className="w-6 h-6 text-red-500" />
          </div>
        </div>
      </div>

      {/* Repository Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Repository Breakdown
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Repository
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Huge Commits
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  WIP Commits
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Quick Fixes
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Long Branches
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Stale Deps
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Automation
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {indicators.repositories.map((repo, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {repo.repoName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {repo.indicators.hugeCommits.length}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {repo.indicators.wipCommits.length}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {repo.indicators.quickFixCommits.length}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {repo.indicators.longLivedBranches.length}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {repo.indicators.dependencyDrift.staleDependencies.length}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {repo.indicators.missingAutomation.hasDependencyAutomation &&
                    repo.indicators.missingAutomation.hasCicdAutomation ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Complete
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                        Missing
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
