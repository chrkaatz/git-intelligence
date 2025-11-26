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
import type { TechnicalDebtIndicators as TechnicalDebtIndicatorsType } from '../api';
import {
  Code,
  GitBranch,
  AlertTriangle,
  Package,
  Wrench,
  Zap,
  FileArchive,
  FolderTree,
  XCircle,
  CheckCircle,
} from 'lucide-react';

interface TechnicalDebtIndicatorsProps {
  indicators: TechnicalDebtIndicatorsType;
}

export function TechnicalDebtIndicators({ indicators }: TechnicalDebtIndicatorsProps) {
  const [selectedSection, setSelectedSection] = useState<
    | 'commented-code'
    | 'huge-commits'
    | 'wip-commits'
    | 'quick-fix'
    | 'binary-files'
    | 'vendored'
    | 'branches'
    | 'dependencies'
    | 'automation'
  >('commented-code');

  const getRiskColor = (riskLevel: 'low' | 'medium' | 'high') => {
    switch (riskLevel) {
      case 'high':
        return '#ef4444'; // red
      case 'medium':
        return '#f59e0b'; // yellow
      case 'low':
        return '#10b981'; // green
      default:
        return '#6b7280'; // gray
    }
  };

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

  const sections = [
    {
      id: 'commented-code' as const,
      label: 'Commented Code',
      icon: Code,
      count: indicators.commentedOutCode.length,
    },
    {
      id: 'huge-commits' as const,
      label: 'Huge Commits',
      icon: GitBranch,
      count: indicators.hugeCommits.length,
    },
    {
      id: 'wip-commits' as const,
      label: 'WIP Commits',
      icon: AlertTriangle,
      count: indicators.wipCommits.length,
    },
    {
      id: 'quick-fix' as const,
      label: 'Quick Fixes',
      icon: Zap,
      count: indicators.quickFixCommits.length,
    },
    {
      id: 'binary-files' as const,
      label: 'Binary Files',
      icon: FileArchive,
      count: indicators.largeBinaryFiles.length,
    },
    {
      id: 'vendored' as const,
      label: 'Vendored Code',
      icon: FolderTree,
      count: indicators.vendoredCodeGrowth.length,
    },
    {
      id: 'branches' as const,
      label: 'Branches',
      icon: GitBranch,
      count: indicators.longLivedBranches.length,
    },
    {
      id: 'dependencies' as const,
      label: 'Dependencies',
      icon: Package,
      count: indicators.dependencyDrift.staleDependencies.length,
    },
    { id: 'automation' as const, label: 'Automation', icon: Wrench, count: 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Section Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setSelectedSection(section.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                selectedSection === section.id
                  ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {section.label}
              {section.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-white/20 dark:bg-black/20">
                  {section.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Commented-Out Code Section */}
      {selectedSection === 'commented-code' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Code className="w-5 h-5 text-blue-500" />
              Commented-Out Code
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Files with commented-out code detected in commit diffs, indicating potential dead code
              or incomplete refactoring.
            </p>
          </div>

          {indicators.commentedOutCode.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-500">
              No commented-out code detected.
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        File
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Commit
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Lines
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Risk
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {indicators.commentedOutCode.slice(0, 50).map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100">
                          {item.file}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-500 dark:text-gray-400">
                          {item.commitHash.substring(0, 8)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(item.commitDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {item.linesCommented}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.riskLevel === 'high'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                : item.riskLevel === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            }`}
                          >
                            {getRiskLabel(item.riskLevel)}
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

      {/* Huge Commits Section */}
      {selectedSection === 'huge-commits' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-orange-500" />
              Huge Commits
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Large atomic changes indicating bundling or lack of incremental development. These
              commits are harder to review and increase risk.
            </p>
          </div>

          {indicators.hugeCommits.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-500">
              No huge commits found.
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Commit
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Author
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Files
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Changes
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Risk
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {indicators.hugeCommits.slice(0, 50).map((commit, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3">
                            <div className="text-sm font-mono text-gray-900 dark:text-gray-100">
                              {commit.commitHash.substring(0, 8)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md truncate">
                              {commit.message}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {commit.author}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {new Date(commit.commitDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {commit.filesChanged}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            <div>+{commit.linesAdded.toLocaleString()}</div>
                            <div>-{commit.linesRemoved.toLocaleString()}</div>
                            <div className="font-semibold">
                              {commit.totalChanges.toLocaleString()} total
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                commit.riskLevel === 'high'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                  : commit.riskLevel === 'medium'
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              }`}
                            >
                              {getRiskLabel(commit.riskLevel)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Commit Size Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={indicators.hugeCommits.slice(0, 20)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="commitHash"
                      tickFormatter={(value) => value.substring(0, 8)}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalChanges" name="Total Changes">
                      {indicators.hugeCommits.slice(0, 20).map((entry, index) => (
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

      {/* WIP Commits Section */}
      {selectedSection === 'wip-commits' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              WIP Commits
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Work-in-progress commits suggesting incomplete or rushed development.
            </p>
          </div>

          {indicators.wipCommits.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-500">
              No WIP commits found.
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Commit
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Author
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Message
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Keywords
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {indicators.wipCommits.slice(0, 100).map((commit, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100">
                          {commit.commitHash.substring(0, 8)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {commit.author}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(commit.commitDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-md">
                          {commit.message}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {commit.wipKeywords.map((keyword, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
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

      {/* Quick Fix Commits Section */}
      {selectedSection === 'quick-fix' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              Quick Fix Commits
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Commits indicating short-term solutions that may need proper fixes later.
            </p>
          </div>

          {indicators.quickFixCommits.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-500">
              No quick fix commits found.
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Commit
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Author
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Message
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Keywords
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {indicators.quickFixCommits.slice(0, 100).map((commit, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100">
                          {commit.commitHash.substring(0, 8)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {commit.author}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(commit.commitDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-md">
                          {commit.message}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {commit.quickFixKeywords.map((keyword, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
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

      {/* Large Binary Files Section */}
      {selectedSection === 'binary-files' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FileArchive className="w-5 h-5 text-purple-500" />
              Large Binary Files
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Large binary files that may indicate repository hygiene issues.
            </p>
          </div>

          {indicators.largeBinaryFiles.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-500">
              No large binary files found.
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        File
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Added
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Risk
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {indicators.largeBinaryFiles.slice(0, 50).map((file, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100">
                          {file.file}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {file.sizeMB.toFixed(2)} MB
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {file.fileType || 'unknown'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {file.commitDate ? new Date(file.commitDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              file.riskLevel === 'high'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                : file.riskLevel === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            }`}
                          >
                            {getRiskLabel(file.riskLevel)}
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

      {/* Vendored Code Growth Section */}
      {selectedSection === 'vendored' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-green-500" />
              Vendored Code Growth
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Expansion of third-party dependencies embedded in the repository.
            </p>
          </div>

          {indicators.vendoredCodeGrowth.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-500">
              No significant vendored code growth detected.
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Directory
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Initial Size
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Current Size
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Growth
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Files Added
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Risk
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {indicators.vendoredCodeGrowth.slice(0, 20).map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100">
                          {item.directory}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {item.initialSize} files
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {item.currentSize} files
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {item.growthPercentage.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {item.filesAdded}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.riskLevel === 'high'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                : item.riskLevel === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            }`}
                          >
                            {getRiskLabel(item.riskLevel)}
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

      {/* Long-Lived Branches Section */}
      {selectedSection === 'branches' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-blue-500" />
              Long-Lived Branches
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Branches that exist for extended periods without merging, indicating abandoned
              features, incomplete work, or process issues.
            </p>
          </div>

          {indicators.longLivedBranches.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-500">
              No long-lived branches found.
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Branches</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {indicators.branchProliferation.totalBranches}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Active Branches</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {indicators.branchProliferation.activeBranches}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Merged</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {indicators.branchProliferation.mergedBranches}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Unmerged</div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {indicators.branchProliferation.unmergedBranches}
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Branch
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Last Commit
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Age (days)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Commits
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Risk
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {indicators.longLivedBranches.slice(0, 50).map((branch, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100">
                            {branch.branchName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {new Date(branch.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {new Date(branch.lastCommitDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {branch.daysSinceCreation}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {branch.commitCount}
                          </td>
                          <td className="px-4 py-3">
                            {branch.isMerged ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Merged
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                <XCircle className="w-3 h-3 mr-1" />
                                Unmerged
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                branch.riskLevel === 'high'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                  : branch.riskLevel === 'medium'
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              }`}
                            >
                              {getRiskLabel(branch.riskLevel)}
                            </span>
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

      {/* Dependencies Section */}
      {selectedSection === 'dependencies' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-500" />
              Dependency Drift
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Analysis of dependency changes and stale dependencies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Lockfiles Found
              </h3>
              {indicators.dependencyDrift.lockfiles.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No lockfiles found.</p>
              ) : (
                <ul className="space-y-2">
                  {indicators.dependencyDrift.lockfiles.map((lockfile, index) => (
                    <li key={index} className="text-sm font-mono text-gray-700 dark:text-gray-300">
                      {lockfile}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Stale Dependencies
              </h3>
              {indicators.dependencyDrift.staleDependencies.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No stale dependencies found.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Lockfile
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Last Updated
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Days Since
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Risk
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {indicators.dependencyDrift.staleDependencies.map((dep, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100">
                            {dep.lockfile}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {new Date(dep.lastUpdated).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {dep.daysSinceUpdate}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                dep.riskLevel === 'high'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                  : dep.riskLevel === 'medium'
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              }`}
                            >
                              {getRiskLabel(dep.riskLevel)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {indicators.dependencyDrift.dependencyBumps.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Recent Dependency Bumps
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Lockfile
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Commit
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Added
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Removed
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {indicators.dependencyDrift.dependencyBumps.slice(0, 50).map((bump, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100">
                          {bump.lockfile}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-500 dark:text-gray-400">
                          {bump.commitHash.substring(0, 8)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(bump.commitDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400">
                          +{bump.dependenciesAdded}
                        </td>
                        <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400">
                          -{bump.dependenciesRemoved}
                        </td>
                        <td className="px-4 py-3 text-sm text-blue-600 dark:text-blue-400">
                          {bump.dependenciesUpdated}
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

      {/* Missing Automation Section */}
      {selectedSection === 'automation' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-gray-500" />
              Missing Automation
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Absence of automation indicates technical debt: missing dependency update automation
              and CI/CD workflows increase risk.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                {indicators.missingAutomation.hasDependencyAutomation ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                Dependency Automation
              </h3>
              {indicators.missingAutomation.hasDependencyAutomation ? (
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400 mb-2">Configured</p>
                  <ul className="space-y-1">
                    {indicators.missingAutomation.dependencyAutomationFiles.map((file, index) => (
                      <li
                        key={index}
                        className="text-sm font-mono text-gray-700 dark:text-gray-300"
                      >
                        {file}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-red-600 dark:text-red-400">
                  No dependency automation found (Dependabot/Renovate). Manual dependency management
                  increases risk of security vulnerabilities.
                </p>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                {indicators.missingAutomation.hasCicdAutomation ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                CI/CD Automation
              </h3>
              {indicators.missingAutomation.hasCicdAutomation ? (
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400 mb-2">Configured</p>
                  <ul className="space-y-1">
                    {indicators.missingAutomation.cicdAutomationFiles.map((file, index) => (
                      <li
                        key={index}
                        className="text-sm font-mono text-gray-700 dark:text-gray-300"
                      >
                        {file}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-red-600 dark:text-red-400">
                  No CI/CD automation found (GitHub Actions, GitLab CI, CircleCI, Jenkins). Lack of
                  automated testing increases risk of regressions.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Overall Risk</h3>
            <div className="flex items-center gap-4">
              <span
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium ${
                  indicators.missingAutomation.riskLevel === 'high'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    : indicators.missingAutomation.riskLevel === 'medium'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                }`}
              >
                {getRiskLabel(indicators.missingAutomation.riskLevel)}
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {indicators.missingAutomation.riskLevel === 'high' &&
                  'Both dependency automation and CI/CD are missing. High risk of security vulnerabilities and regressions.'}
                {indicators.missingAutomation.riskLevel === 'medium' &&
                  'One automation type is missing. Medium risk.'}
                {indicators.missingAutomation.riskLevel === 'low' &&
                  'Both automation types are present. Low risk.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
