import { useState, Fragment } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { CrossRepoDeveloperStats, CrossRepoDeveloperAnalytics } from '../api';
import {
  Code,
  GitCommit,
  TrendingUp,
  Mail,
  AlertTriangle,
  RotateCcw,
  Activity,
  FolderOpen,
} from 'lucide-react';

interface CrossRepoDeveloperAnalyticsProps {
  analytics: CrossRepoDeveloperAnalytics;
  loading?: boolean;
}

export function CrossRepoDeveloperAnalytics({
  analytics,
  loading,
}: CrossRepoDeveloperAnalyticsProps) {
  const [selectedAuthor, setSelectedAuthor] = useState<CrossRepoDeveloperStats | null>(null);
  const [expandedAuthor, setExpandedAuthor] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!analytics || !analytics.authors || analytics.authors.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No cross-repo developer data available. Add multiple repositories to a project to see
        cross-repo analytics.
      </div>
    );
  }

  // Prepare data for charts
  const commitsData = analytics.authors.slice(0, 10).map((a) => ({
    name: a.name.length > 15 ? a.name.substring(0, 15) + '...' : a.name,
    commits: a.commits,
    fullName: a.name,
  }));

  const repoSpreadData = analytics.authors
    .filter((a) => a.repoCount > 1)
    .slice(0, 10)
    .map((a) => ({
      name: a.name.length > 15 ? a.name.substring(0, 15) + '...' : a.name,
      repoCount: a.repoCount,
      fullName: a.name,
    }));

  // Prepare repo spread pie chart data for selected author
  const repoSpreadPieData = selectedAuthor
    ? selectedAuthor.repoSpread.map((repo) => ({
        name: repo.repoName,
        value: repo.commits,
      }))
    : [];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="space-y-6">
      {/* Project Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <FolderOpen className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Project Overview</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Repositories</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.totalRepos}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Developers</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.authors.length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Commits</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.authors.reduce((sum, a) => sum + a.commits, 0).toLocaleString()}
            </p>
          </div>
        </div>
        {analytics.repoNames.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Repositories:</p>
            <div className="flex flex-wrap gap-2">
              {analytics.repoNames.map((name, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded text-xs"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Developers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.authors.length}
              </p>
            </div>
            <Code className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Commits</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.authors.reduce((sum, a) => sum + a.commits, 0).toLocaleString()}
              </p>
            </div>
            <GitCommit className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Lines Added</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.authors.reduce((sum, a) => sum + a.linesAdded, 0).toLocaleString()}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Multi-Repo Developers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.authors.filter((a) => a.repoCount > 1).length}
              </p>
            </div>
            <FolderOpen className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Quality-Adjacent Signals Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Fix Commits</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.authors.reduce((sum, a) => sum + a.fixCommits, 0).toLocaleString()}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Revert Commits</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.authors.reduce((sum, a) => sum + a.revertCommits, 0).toLocaleString()}
              </p>
            </div>
            <RotateCcw className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Churn</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.authors.reduce((sum, a) => sum + a.churn, 0).toLocaleString()}
              </p>
            </div>
            <Activity className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Commits per Author */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Commits per Author (Top 10)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={commitsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="commits" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Repo Spread */}
        {repoSpreadData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Repository Spread (Top 10)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={repoSpreadData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="repoCount" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Repo Spread Pie Chart for Selected Author */}
        {selectedAuthor && repoSpreadPieData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Repository Distribution - {selectedAuthor.name}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={repoSpreadPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name ?? ''}: ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {repoSpreadPieData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Developer List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Developer Details (Cross-Repo)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Developer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Repos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Commits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Lines Added
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Lines Removed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Net Lines
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fix Ratio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Revert Ratio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {analytics.authors.map((author, index) => (
                <Fragment key={`${author.email}-${index}`}>
                  <tr
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      selectedAuthor?.email === author.email ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <button
                            onClick={() => {
                              setExpandedAuthor(
                                expandedAuthor === author.email ? null : author.email
                              );
                            }}
                            className="text-sm font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left"
                          >
                            {author.name}
                          </button>
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {author.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {author.repoCount}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {author.repoCount > 1 ? 'Multi-repo' : 'Single-repo'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {author.commits.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {author.percentage}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-green-600 dark:text-green-400">
                        +{author.linesAdded.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-red-600 dark:text-red-400">
                        -{author.linesRemoved.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className={`text-sm font-medium ${
                          author.netLines >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {author.netLines >= 0 ? '+' : ''}
                        {author.netLines.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {author.fixCommits.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {author.fixCommitRatio}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {author.revertCommits.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {author.revertCommitRatio}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() =>
                          setSelectedAuthor(selectedAuthor?.email === author.email ? null : author)
                        }
                        className={`px-3 py-1 rounded ${
                          selectedAuthor?.email === author.email
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {selectedAuthor?.email === author.email ? 'Hide' : 'View Repos'}
                      </button>
                    </td>
                  </tr>
                  {expandedAuthor === author.email && author.repoSpread.length > 0 && (
                    <tr
                      key={`${author.email}-${index}-spread`}
                      className="bg-gray-50 dark:bg-gray-900"
                    >
                      <td colSpan={9} className="px-6 py-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Repository Spread:
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {author.repoSpread.map((repo, idx) => (
                              <div
                                key={idx}
                                className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700"
                              >
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {repo.repoName}
                                </p>
                                <div className="mt-1 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                                  <div>Commits: {repo.commits.toLocaleString()}</div>
                                  <div>Added: +{repo.linesAdded.toLocaleString()}</div>
                                  <div>Removed: -{repo.linesRemoved.toLocaleString()}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
