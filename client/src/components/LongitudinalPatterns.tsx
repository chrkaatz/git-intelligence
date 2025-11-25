import { useState } from 'react';
import { LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area } from 'recharts';
import type { LongitudinalPatterns } from '../api';
import { TrendingUp, Users, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface LongitudinalPatternsProps {
  patterns: LongitudinalPatterns;
  selectedAuthorName?: string | null;
  onAuthorSelect?: (authorName: string | null) => void;
}

export function LongitudinalPatterns({ patterns, selectedAuthorName, onAuthorSelect }: LongitudinalPatternsProps) {
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(selectedAuthorName || null);
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly'>('monthly');

  // Sync with external selection
  const currentSelection = selectedAuthorName !== undefined ? selectedAuthorName : selectedAuthor;

  // Debug: Check if data exists
  if (!patterns.authorActivityOverTime || patterns.authorActivityOverTime.length === 0) {
    console.warn('No author activity over time data available', patterns);
  }

  const handleAuthorChange = (authorName: string | null) => {
    setSelectedAuthor(authorName);
    if (onAuthorSelect) {
      onAuthorSelect(authorName);
    }
  };

  // Prepare onboarding curve data
  const onboardingData = patterns.onboardingCurve.map(item => ({
    date: item.date,
    newAuthors: item.newAuthors,
    cumulative: 0, // Will calculate below
  }));

  // Calculate cumulative authors
  let cumulative = 0;
  onboardingData.forEach(item => {
    cumulative += item.newAuthors;
    item.cumulative = cumulative;
  });

  // Prepare dormancy data
  const activeCount = patterns.dormancyDetection.filter(d => d.status === 'active').length;
  const dormantCount = patterns.dormancyDetection.filter(d => d.status === 'dormant').length;
  const inactiveCount = patterns.dormancyDetection.filter(d => d.status === 'inactive').length;

  // Get selected author activity
  const selectedAuthorActivity = currentSelection
    ? patterns.authorActivityOverTime.find(a => a.authorName === currentSelection)
    : null;

  const activityData = selectedAuthorActivity
    ? (timeframe === 'weekly' ? selectedAuthorActivity.weeklyActivity : selectedAuthorActivity.monthlyActivity)
    : [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Contributors</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{activeCount}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Dormant Contributors</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{dormantCount}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Inactive Contributors</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{inactiveCount}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Onboarding Curve */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Onboarding Curve
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          New contributors joining over time
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={onboardingData} margin={{ top: 5, right: 50, left: 50, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
              label={{ value: 'Month', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: '#3b82f6', fontWeight: '500' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#10b981', fontWeight: '500' }}
            />
            <Tooltip />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="newAuthors"
              fill="#3b82f6"
              name="New Authors (per month)"
              barSize={30}
              radius={[4, 4, 0, 0]}
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="cumulative"
              fill="#10b981"
              stroke="#10b981"
              name="Cumulative Authors"
              strokeWidth={2}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Author Activity Over Time */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Author Activity Over Time
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {currentSelection ? `Activity for ${currentSelection}` : 'Select an author to view their activity'}
            </p>
          </div>
          {currentSelection && (
            <div className="flex gap-2">
              <button
                onClick={() => setTimeframe('weekly')}
                className={`px-3 py-1 rounded text-sm ${
                  timeframe === 'weekly'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}>
                Weekly
              </button>
              <button
                onClick={() => setTimeframe('monthly')}
                className={`px-3 py-1 rounded text-sm ${
                  timeframe === 'monthly'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}>
                Monthly
              </button>
            </div>
          )}
        </div>

        {selectedAuthorActivity ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey={timeframe === 'weekly' ? 'week' : 'month'}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="commits"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Commits"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>Select an author from the list below to view their activity over time</p>
          </div>
        )}

        {/* Author Selection */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Author:
          </label>
          <select
            value={currentSelection || ''}
            onChange={(e) => handleAuthorChange(e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
            <option value="">-- Select an author --</option>
            {patterns.authorActivityOverTime && patterns.authorActivityOverTime.length > 0 ? (
              patterns.authorActivityOverTime
                .sort((a, b) => a.authorName.localeCompare(b.authorName))
                .map(author => (
                  <option key={author.authorName} value={author.authorName}>
                    {author.authorName} ({author.authorEmail})
                  </option>
                ))
            ) : (
              <option value="" disabled>No author activity data available</option>
            )}
          </select>
          {currentSelection && (
            <button
              onClick={() => handleAuthorChange(null)}
              className="mt-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
              Clear selection
            </button>
          )}
        </div>
      </div>

      {/* Dormancy Detection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Dormancy Detection
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Contributors who haven't committed recently
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contributor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Days Since Last Commit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Commits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Commit
                </th>
              </tr>
            </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {patterns.dormancyDetection.map((contributor, index) => {
                const statusColors = {
                  active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
                  dormant: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
                  inactive: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
                };

                return (
                  <tr key={`${contributor.authorEmail}-${index}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {contributor.authorName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {contributor.authorEmail}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[contributor.status]}`}>
                        {contributor.status.charAt(0).toUpperCase() + contributor.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {contributor.daysSinceLastCommit} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {contributor.totalCommits.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(contributor.lastCommit).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

