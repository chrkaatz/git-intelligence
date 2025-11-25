import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { DeveloperAuthorStats, LongitudinalPatterns } from '../api';
import { Code, GitCommit, TrendingUp, Shield, Mail, AlertTriangle, RotateCcw, Activity } from 'lucide-react';
import { LongitudinalPatterns as LongitudinalPatternsComponent } from './LongitudinalPatterns';

interface DeveloperAnalyticsProps {
  authors: DeveloperAuthorStats[];
  longitudinalPatterns?: LongitudinalPatterns;
  loading?: boolean;
}

export function DeveloperAnalytics({ authors, longitudinalPatterns, loading }: DeveloperAnalyticsProps) {
  const [selectedAuthor, setSelectedAuthor] = useState<DeveloperAuthorStats | null>(null);
  const [selectedAuthorForLongitudinal, setSelectedAuthorForLongitudinal] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!authors || authors.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No developer data available.
      </div>
    );
  }

  // Prepare data for charts
  const commitsData = authors.slice(0, 10).map(a => ({
    name: a.name.length > 15 ? a.name.substring(0, 15) + '...' : a.name,
    commits: a.commits,
    fullName: a.name,
  }));

  const linesData = authors.slice(0, 10).map(a => ({
    name: a.name.length > 15 ? a.name.substring(0, 15) + '...' : a.name,
    added: a.linesAdded,
    removed: a.linesRemoved,
    net: a.netLines,
    fullName: a.name,
  }));

  // Prepare active time windows data for selected author
  const hourData = selectedAuthor
    ? Object.entries(selectedAuthor.activeTimeWindows.hourOfDay)
        .map(([hour, count]) => ({ hour: parseInt(hour), commits: count }))
        .sort((a, b) => a.hour - b.hour)
    : [];

  const dayData = selectedAuthor
    ? Object.entries(selectedAuthor.activeTimeWindows.dayOfWeek)
        .map(([day, count]) => ({
          day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parseInt(day)],
          commits: count,
        }))
    : [];

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Developers</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{authors.length}</p>
            </div>
            <Code className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Commits</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {authors.reduce((sum, a) => sum + a.commits, 0).toLocaleString()}
              </p>
            </div>
            <GitCommit className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Lines Added</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {authors.reduce((sum, a) => sum + a.linesAdded, 0).toLocaleString()}
              </p>
            </div>
            <TrendingUp className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Signed</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {authors.reduce((sum, a) => sum + a.signedCommits, 0).toLocaleString()}
              </p>
            </div>
            <Shield className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
      </div>

      {/* Quality-Adjacent Signals Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Fix Commits</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white mt-1">
                {authors.reduce((sum, a) => sum + a.fixCommits, 0).toLocaleString()}
              </p>
            </div>
            <AlertTriangle className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Revert Commits</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white mt-1">
                {authors.reduce((sum, a) => sum + a.revertCommits, 0).toLocaleString()}
              </p>
            </div>
            <RotateCcw className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Churn</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white mt-1">
                {authors.reduce((sum, a) => sum + a.churn, 0).toLocaleString()}
              </p>
            </div>
            <Activity className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Commits per Author */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            Commits per Author
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

        {/* Lines Added/Removed */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            Lines Added/Removed
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={linesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="added" fill="#10b981" name="Added" />
              <Bar dataKey="removed" fill="#ef4444" name="Removed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active Time Windows for Selected Author */}
      {selectedAuthor && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Activity by Hour - {selectedAuthor.name}
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hourData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="commits" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Activity by Day - {selectedAuthor.name}
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dayData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="commits" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Developer List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Developers
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
                  Signed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fix Ratio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Revert Ratio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Churn
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  First Commit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Commit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {authors.map((author, index) => (
                <tr
                  key={`${author.email}-${index}`}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    selectedAuthor?.email === author.email ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <button
                          onClick={() => {
                            setSelectedAuthorForLongitudinal(author.name);
                            // Scroll to longitudinal patterns section
                            setTimeout(() => {
                              const element = document.getElementById('longitudinal-patterns');
                              element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 100);
                          }}
                          className="text-sm font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left">
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
                    <div className="text-sm text-gray-900 dark:text-white">{author.commits.toLocaleString()}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{author.percentage}%</div>
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
                    <div className={`text-sm font-medium ${
                      author.netLines >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {author.netLines >= 0 ? '+' : ''}{author.netLines.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {author.signedCommits.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {author.signedCommitsPercentage}%
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {author.churn.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {author.churnRatio}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(author.firstCommit).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(author.lastCommit).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setSelectedAuthor(selectedAuthor?.email === author.email ? null : author)}
                      className={`px-3 py-1 rounded ${
                        selectedAuthor?.email === author.email
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {selectedAuthor?.email === author.email ? 'Hide' : 'View Activity'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Longitudinal Patterns */}
      {longitudinalPatterns && (
        <div id="longitudinal-patterns" className="mt-8">
          <LongitudinalPatternsComponent
            patterns={longitudinalPatterns}
            selectedAuthorName={selectedAuthorForLongitudinal}
            onAuthorSelect={setSelectedAuthorForLongitudinal}
          />
        </div>
      )}
    </div>
  );
}

