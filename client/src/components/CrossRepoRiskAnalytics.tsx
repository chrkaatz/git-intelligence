import { useState } from 'react';
import type { CrossRepoRiskAnalytics as CrossRepoRiskAnalyticsType } from '../api';
import { Flame, Link2, TrendingUp, GitBranch } from 'lucide-react';

interface CrossRepoRiskAnalyticsProps {
  analytics: CrossRepoRiskAnalyticsType;
  loading?: boolean;
}

export function CrossRepoRiskAnalytics({ analytics, loading }: CrossRepoRiskAnalyticsProps) {
  const [selectedSection, setSelectedSection] = useState<'high-risk' | 'coupling' | 'trends'>(
    'high-risk'
  );

  const getRiskLabel = (riskLevel: 'low' | 'medium' | 'high') => {
    switch (riskLevel) {
      case 'high':
        return 'High Risk';
      case 'medium':
        return 'Medium Risk';
      case 'low':
        return 'Low Risk';
      default:
        return 'Unknown';
    }
  };

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
                High-Risk Files
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {analytics.highRiskHotspots.aggregatedFiles.length}
              </p>
            </div>
            <Flame className="w-6 h-6 text-orange-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Coupled Files
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {analytics.temporalCouplingHotspots.aggregatedFiles.length}
              </p>
            </div>
            <Link2 className="w-6 h-6 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Risky Trends
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {analytics.riskyFileTrends.aggregatedFiles.length}
              </p>
            </div>
            <TrendingUp className="w-6 h-6 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-4">
        <button
          onClick={() => setSelectedSection('high-risk')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedSection === 'high-risk'
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          <Flame className="w-4 h-4 inline mr-2" />
          High-Risk Hotspots
        </button>
        <button
          onClick={() => setSelectedSection('coupling')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedSection === 'coupling'
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          <Link2 className="w-4 h-4 inline mr-2" />
          Temporal Coupling
        </button>
        <button
          onClick={() => setSelectedSection('trends')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedSection === 'trends'
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          <TrendingUp className="w-4 h-4 inline mr-2" />
          Risky File Trends
        </button>
      </div>

      {/* High-Risk Hotspots Section */}
      {selectedSection === 'high-risk' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              High-Risk Hotspots Across Repositories
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Files with high risk scores across all repositories in the project.
            </p>
          </div>

          {analytics.highRiskHotspots.aggregatedFiles.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-500">
              No high-risk hotspots found.
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Top High-Risk Files
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        File
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Risk Score
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Risk Level
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Churn
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Complexity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Ownership
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {analytics.highRiskHotspots.aggregatedFiles
                      .slice(0, 20)
                      .map((hotspot, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-100">
                            {hotspot.file}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            <span className="font-semibold">{hotspot.riskScore.toFixed(1)}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                hotspot.riskLevel === 'high'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                  : hotspot.riskLevel === 'medium'
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              }`}
                            >
                              {getRiskLabel(hotspot.riskLevel)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {hotspot.churn} commits
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {hotspot.complexity.toFixed(0)} lines avg
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {hotspot.ownershipDiversity} author
                            {hotspot.ownershipDiversity !== 1 ? 's' : ''}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Temporal Coupling Section */}
      {selectedSection === 'coupling' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-blue-500" />
              Temporal Coupling Hotspots Across Repositories
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Files that change together frequently across all repositories.
            </p>
          </div>

          {analytics.temporalCouplingHotspots.aggregatedFiles.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-500">
              No temporal coupling hotspots found.
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Top Coupled Files
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        File
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Coupling Count
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Total Co-Changes
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Risk Level
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {analytics.temporalCouplingHotspots.aggregatedFiles
                      .slice(0, 20)
                      .map((hotspot, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-100">
                            {hotspot.file}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            <span className="font-semibold">{hotspot.couplingCount}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {hotspot.totalCoChanges}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                hotspot.riskLevel === 'high'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                  : hotspot.riskLevel === 'medium'
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              }`}
                            >
                              {getRiskLabel(hotspot.riskLevel)}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Risky File Trends Section */}
      {selectedSection === 'trends' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              Risky File Trends Across Repositories
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Historical risk patterns across all repositories.
            </p>
          </div>

          {analytics.riskyFileTrends.aggregatedFiles.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-500">
              No risky file trends found.
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Top Risky File Trends
              </h3>
              <div className="space-y-4">
                {analytics.riskyFileTrends.aggregatedFiles.slice(0, 10).map((trend, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                          {trend.file}
                        </p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Current Risk:{' '}
                            <span className="font-semibold">
                              {trend.currentRiskScore.toFixed(1)}
                            </span>
                          </span>
                          <span
                            className={`text-xs font-medium ${
                              trend.trendDirection === 'increasing'
                                ? 'text-red-600 dark:text-red-400'
                                : trend.trendDirection === 'decreasing'
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {trend.trendDirection === 'increasing' && '↑'}
                            {trend.trendDirection === 'decreasing' && '↓'}
                            {trend.trendDirection === 'stable' && '→'}{' '}
                            {Math.abs(trend.trendPercentage).toFixed(1)}%
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              trend.riskLevel === 'high'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                : trend.riskLevel === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            }`}
                          >
                            {getRiskLabel(trend.riskLevel)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
