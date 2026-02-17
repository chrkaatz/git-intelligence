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
  LineChart,
  Line,
  Cell,
} from 'recharts';
import type { RiskAnalytics as RiskAnalyticsType } from '../api';
import { getRiskColor, getRiskLabel } from './common/riskUtils';
import { Link2, TrendingUp, Flame, ShieldCheck, AlertTriangle } from 'lucide-react';

interface RiskAnalyticsProps {
  highRiskHotspots: RiskAnalyticsType['highRiskHotspots'];
  temporalCouplingHotspots: RiskAnalyticsType['temporalCouplingHotspots'];
  riskyFileTrends: RiskAnalyticsType['riskyFileTrends'];
  coverage?: RiskAnalyticsType['coverage'];
}

export function RiskAnalytics({
  highRiskHotspots,
  temporalCouplingHotspots,
  riskyFileTrends,
  coverage,
}: RiskAnalyticsProps) {
  const [selectedSection, setSelectedSection] = useState<'high-risk' | 'coupling' | 'trends'>(
    'high-risk'
  );

  const getTrendColor = (direction: 'increasing' | 'decreasing' | 'stable') => {
    switch (direction) {
      case 'increasing':
        return '#ef4444'; // red
      case 'decreasing':
        return '#10b981'; // green
      case 'stable':
        return '#6b7280'; // gray
      default:
        return '#6b7280';
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
        <div className="flex flex-wrap gap-2">
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

        {coverage && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              Total Coverage: {coverage.totalCoverage.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* High-Risk Hotspots Section */}
      {selectedSection === 'high-risk' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              High-Risk Hotspots
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Files combining high churn, high complexity, and low ownership diversity. These areas
              are most likely to cause regressions and require careful attention.
            </p>
          </div>

          {highRiskHotspots.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-500">
              No high-risk hotspots found.
            </div>
          ) : (
            <>
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
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Coverage
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {highRiskHotspots.slice(0, 20).map((hotspot, index) => (
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
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {hotspot.coverage !== undefined ? (
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      hotspot.coverage > 80
                                        ? 'bg-green-500'
                                        : hotspot.coverage > 50
                                          ? 'bg-yellow-500'
                                          : 'bg-red-500'
                                    }`}
                                    style={{ width: `${hotspot.coverage}%` }}
                                  />
                                </div>
                                <span
                                  className={
                                    hotspot.coverage < 50
                                      ? 'text-red-600 dark:text-red-400 font-medium'
                                      : 'text-gray-600 dark:text-gray-400'
                                  }
                                >
                                  {hotspot.coverage.toFixed(1)}%
                                </span>
                                {hotspot.riskLevel === 'high' && hotspot.coverage < 50 && (
                                  <span title="High risk hotspot with low coverage!">
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">No data</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Risk Score Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={highRiskHotspots.slice(0, 15)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="file"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="riskScore" name="Risk Score">
                      {highRiskHotspots.slice(0, 15).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getRiskColor(entry.riskLevel)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}

      {/* Temporal Coupling Hotspots Section */}
      {selectedSection === 'coupling' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-blue-500" />
              Temporal Coupling Hotspots
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Files that change together frequently, indicating potential architecture smells and
              hidden dependencies.
            </p>
          </div>

          {temporalCouplingHotspots.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-500">
              No temporal coupling hotspots found.
            </div>
          ) : (
            <>
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
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Related Files
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {temporalCouplingHotspots.slice(0, 20).map((hotspot, index) => (
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
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex flex-wrap gap-1">
                              {hotspot.relatedFiles.slice(0, 3).map((file, i) => (
                                <span
                                  key={i}
                                  className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono"
                                >
                                  {file.split('/').pop()}
                                </span>
                              ))}
                              {hotspot.relatedFiles.length > 3 && (
                                <span className="text-xs text-gray-400">
                                  +{hotspot.relatedFiles.length - 3} more
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Risky File Trends Section */}
      {selectedSection === 'trends' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              Risky File Trends
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Historical patterns showing how risk scores have evolved over time. Files with
              increasing risk trends may predict future regressions.
            </p>
          </div>

          {riskyFileTrends.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-500">
              No risky file trends found.
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Risk Trends Over Time
                </h3>
                <div className="space-y-6">
                  {riskyFileTrends.slice(0, 10).map((trend, index) => (
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
                      <ResponsiveContainer width="100%" height={150}>
                        <LineChart data={trend.trendPoints}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10 }}
                            tickFormatter={(value) => {
                              const date = new Date(value);
                              return `${date.getMonth() + 1}/${date.getFullYear().toString().slice(2)}`;
                            }}
                          />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                          <Tooltip
                            labelFormatter={(value) => {
                              const date = new Date(value);
                              return date.toLocaleDateString();
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="riskScore"
                            stroke={getTrendColor(trend.trendDirection)}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
