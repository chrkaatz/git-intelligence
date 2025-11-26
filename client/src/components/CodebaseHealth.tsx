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
  ScatterChart,
  Scatter,
  Cell,
} from 'recharts';
import type { CodebaseHealth as CodebaseHealthType } from '../api';
import {
  Flame,
  Link2,
  TrendingUp,
  FileText,
  Folder,
  AlertTriangle,
  Activity,
  Shield,
  GitBranch,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface CodebaseHealthProps {
  hotspots: CodebaseHealthType['hotspots'];
  changeCoupling: CodebaseHealthType['changeCoupling'];
  stability: CodebaseHealthType['stability'];
  complexity: CodebaseHealthType['complexity'];
  hygiene: CodebaseHealthType['hygiene'];
}

export function CodebaseHealth({
  hotspots,
  changeCoupling,
  stability,
  complexity,
  hygiene,
}: CodebaseHealthProps) {
  const [selectedSection, setSelectedSection] = useState<
    'hotspots' | 'coupling' | 'stability' | 'complexity' | 'hygiene'
  >('hotspots');

  return (
    <div className="space-y-6">
      {/* Section Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-4">
        <button
          onClick={() => setSelectedSection('hotspots')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedSection === 'hotspots'
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          <Flame className="w-4 h-4 inline mr-2" />
          Hotspots
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
          Change Coupling
        </button>
        <button
          onClick={() => setSelectedSection('stability')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedSection === 'stability'
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          <Activity className="w-4 h-4 inline mr-2" />
          Stability
        </button>
        <button
          onClick={() => setSelectedSection('complexity')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedSection === 'complexity'
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          <FileText className="w-4 h-4 inline mr-2" />
          Complexity
        </button>
        <button
          onClick={() => setSelectedSection('hygiene')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedSection === 'hygiene'
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          <Shield className="w-4 h-4 inline mr-2" />
          Repository Hygiene
        </button>
      </div>

      {/* Hotspots Section */}
      {selectedSection === 'hotspots' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              Hotspots - Files with Repeated Modifications
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Files that have been modified frequently, indicating potential areas of high
              maintenance or complexity.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Top File Hotspots
            </h3>
            {hotspots.files.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={hotspots.files.slice(0, 20)}>
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
                    <Bar dataKey="commits" fill="#f97316" name="Commits" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Top 20 Files
                  </h4>
                  <div className="space-y-2">
                    {hotspots.files.slice(0, 20).map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-mono truncate flex-1">
                          {file.file}
                        </span>
                        <span className="text-sm font-semibold text-orange-600 dark:text-orange-400 ml-4">
                          {file.commits} commits
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No hotspot data available.</p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Folder className="w-5 h-5" />
              Directory Hotspots
            </h3>
            {hotspots.directories.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={hotspots.directories.slice(0, 15)}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-gray-300 dark:stroke-gray-700"
                    />
                    <XAxis
                      dataKey="directory"
                      angle={-45}
                      textAnchor="end"
                      height={100}
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
                    <Bar dataKey="commits" fill="#8b5cf6" name="Commits" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                No directory hotspot data available.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Change Coupling Section */}
      {selectedSection === 'coupling' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-blue-500" />
              Change Coupling (Temporal Coupling)
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Files that often change together, indicating hidden dependencies or missing
              modularity.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Most Coupled File Pairs
            </h3>
            {changeCoupling.pairs.length > 0 ? (
              <div className="space-y-2">
                {changeCoupling.pairs.slice(0, 30).map((pair, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-700 dark:text-gray-300 font-mono truncate">
                          {pair.file1}
                        </span>
                        <Link2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300 font-mono truncate">
                          {pair.file2}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 flex items-center gap-4">
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        {pair.coChanges} co-changes
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {pair.coChangePercentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No coupling data available.</p>
            )}
          </div>
        </div>
      )}

      {/* Stability Section */}
      {selectedSection === 'stability' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              Stability Indicators
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              File age vs. change frequency. High churn / low age indicates unstable code, while
              high age / low churn indicates stable foundation.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              File Stability Scatter Plot
            </h3>
            {stability.files.length > 0 ? (
              <ResponsiveContainer width="100%" height={500}>
                <ScatterChart>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-gray-300 dark:stroke-gray-700"
                  />
                  <XAxis
                    type="number"
                    dataKey="ageDays"
                    name="Age (days)"
                    label={{ value: 'File Age (days)', position: 'insideBottom', offset: -5 }}
                    tick={{ fill: 'currentColor' }}
                    className="text-gray-600 dark:text-gray-400"
                  />
                  <YAxis
                    type="number"
                    dataKey="changeFrequency"
                    name="Change Frequency"
                    label={{ value: 'Change Frequency', angle: -90, position: 'insideLeft' }}
                    tick={{ fill: 'currentColor' }}
                    className="text-gray-600 dark:text-gray-400"
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-gray-800 dark:bg-gray-900 border border-gray-700 rounded-lg p-3">
                            <p className="text-white font-mono text-xs mb-1">{data.file}</p>
                            <p className="text-gray-300 text-xs">Age: {data.ageDays} days</p>
                            <p className="text-gray-300 text-xs">Changes: {data.changeFrequency}</p>
                            <p className="text-gray-300 text-xs">Status: {data.status}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter name="Files" data={stability.files} fill="#8884d8">
                    {stability.files.map((entry, index) => {
                      let color = '#8884d8';
                      if (entry.status === 'unstable') color = '#ef4444';
                      else if (entry.status === 'stable') color = '#10b981';
                      else if (entry.status === 'evolving') color = '#f59e0b';
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No stability data available.</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <h4 className="font-medium text-red-900 dark:text-red-300">Unstable Files</h4>
              </div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stability.files.filter((f) => f.status === 'unstable').length}
              </p>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1">High churn, low age</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <h4 className="font-medium text-yellow-900 dark:text-yellow-300">Evolving Files</h4>
              </div>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {stability.files.filter((f) => f.status === 'evolving').length}
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">Moderate changes</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h4 className="font-medium text-green-900 dark:text-green-300">Stable Files</h4>
              </div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stability.files.filter((f) => f.status === 'stable').length}
              </p>
              <p className="text-xs text-green-700 dark:text-green-400 mt-1">Low churn, high age</p>
            </div>
          </div>

          {/* Risky Files List */}
          {stability.files.filter((f) => f.status === 'unstable').length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Risky Files (Unstable)
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Files with high change frequency and low age, indicating potential instability or
                ongoing refactoring.
              </p>
              <div className="space-y-2">
                {stability.files
                  .filter((f) => f.status === 'unstable')
                  .sort((a, b) => b.changeFrequency - a.changeFrequency)
                  .map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-900 dark:text-white font-mono truncate block">
                          {file.file}
                        </span>
                      </div>
                      <div className="ml-4 flex items-center gap-6 flex-shrink-0">
                        <div className="text-right">
                          <span className="text-xs text-gray-500 dark:text-gray-400 block">
                            Age
                          </span>
                          <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                            {file.ageDays} days
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-500 dark:text-gray-400 block">
                            Changes
                          </span>
                          <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                            {file.changeFrequency}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Complexity Section */}
      {selectedSection === 'complexity' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-500" />
              Complexity Proxies
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Complexity indicators derived from Git history: average diff sizes, largest diffs, and
              most rewritten files.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Largest Diffs
              </h3>
              {complexity.largestDiffs.length > 0 ? (
                <div className="space-y-2">
                  {complexity.largestDiffs.slice(0, 15).map((diff, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded"
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-300 font-mono truncate flex-1">
                        {diff.file}
                      </span>
                      <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 ml-4">
                        {diff.linesChanged.toLocaleString()} lines
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No diff data available.</p>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Most Rewritten Files
              </h3>
              {complexity.mostRewritten.length > 0 ? (
                <div className="space-y-2">
                  {complexity.mostRewritten.slice(0, 15).map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded"
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-300 font-mono truncate flex-1">
                        {file.file}
                      </span>
                      <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 ml-4">
                        {file.rewritePercentage.toFixed(1)}% rewritten
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No rewrite data available.</p>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Average Diff Size per File
            </h3>
            {complexity.averageDiffSizes.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={complexity.averageDiffSizes.slice(0, 30)}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-gray-300 dark:stroke-gray-700"
                  />
                  <XAxis
                    dataKey="file"
                    angle={-45}
                    textAnchor="end"
                    height={120}
                    tick={{ fill: 'currentColor', fontSize: 10 }}
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
                  <Bar dataKey="averageDiffSize" fill="#a855f7" name="Avg Diff Size (lines)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                No average diff size data available.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Hygiene Section */}
      {selectedSection === 'hygiene' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              Repository Hygiene Indicators
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Indicators of repository maintenance quality, automation practices, and potential
              technical debt.
            </p>
          </div>

          {/* Branch Count and Lifetime */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              Branch Management
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Branches</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {hygiene.branchCount}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Unmerged Branches
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {hygiene.unmergedBranchCount}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Oldest Unmerged (days)
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {hygiene.oldestUnmergedBranchDays}
                </div>
              </div>
            </div>
            {hygiene.unmergedBranches.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Oldest Unmerged Branches
                </h4>
                <div className="space-y-2">
                  {hygiene.unmergedBranches.slice(0, 10).map((branch, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded"
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                        {branch.name}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {branch.daysSinceLastCommit} days ago
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(branch.lastCommitDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dependency Management Automation */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Dependency Management Automation
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {hygiene.dependencyAutomation.hasDependabot ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Dependabot
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {hygiene.dependencyAutomation.hasRenovate ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Renovate
                  </span>
                </div>
              </div>
              {hygiene.dependencyAutomation.configFiles.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Configuration Files Found
                  </h4>
                  <div className="space-y-1">
                    {hygiene.dependencyAutomation.configFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="text-sm text-gray-600 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-900 rounded px-2 py-1"
                      >
                        {file}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!hygiene.dependencyAutomation.hasDependabot &&
                !hygiene.dependencyAutomation.hasRenovate && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-4">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      No dependency management automation detected. Consider setting up Dependabot
                      or Renovate to automate dependency updates and reduce security risks.
                    </p>
                  </div>
                )}
            </div>
          </div>

          {/* CI/CD Automation */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              CI/CD Automation
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  {hygiene.cicdAutomation.hasGitHubActions ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    GitHub Actions
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {hygiene.cicdAutomation.hasGitLabCI ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    GitLab CI
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {hygiene.cicdAutomation.hasCircleCI ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    CircleCI
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {hygiene.cicdAutomation.hasJenkins ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Jenkins
                  </span>
                </div>
              </div>
              {hygiene.cicdAutomation.configFiles.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Configuration Files Found
                  </h4>
                  <div className="space-y-1">
                    {hygiene.cicdAutomation.configFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="text-sm text-gray-600 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-900 rounded px-2 py-1"
                      >
                        {file}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!hygiene.cicdAutomation.hasGitHubActions &&
                !hygiene.cicdAutomation.hasGitLabCI &&
                !hygiene.cicdAutomation.hasCircleCI &&
                !hygiene.cicdAutomation.hasJenkins && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-4">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      No CI/CD automation detected. Consider setting up GitHub Actions, GitLab CI,
                      CircleCI, or Jenkins to automate testing, quality gates, and deployment
                      practices.
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
