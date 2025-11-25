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
} from 'recharts';
import type { CrossRepoCodebaseHealth as CrossRepoCodebaseHealthType } from '../api';
import { Flame, Folder, FileText, TrendingUp, GitBranch } from 'lucide-react';

interface CrossRepoCodebaseHealthProps {
  health: CrossRepoCodebaseHealthType;
  loading?: boolean;
}

export function CrossRepoCodebaseHealth({ health, loading }: CrossRepoCodebaseHealthProps) {
  const [selectedRepo, setSelectedRepo] = useState<
    CrossRepoCodebaseHealthType['hotspots']['repositories'][0] | null
  >(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!health || health.totalRepos === 0) {
    return <div className="text-center py-12 text-gray-500">No repository data available.</div>;
  }

  // Prepare data for repository hotspots chart
  const repoData = health.hotspots.repositories.map((repo) => ({
    name: repo.repoName.length > 20 ? repo.repoName.substring(0, 20) + '...' : repo.repoName,
    fullName: repo.repoName,
    commits: repo.totalCommits,
    files: repo.totalFiles,
    directories: repo.totalDirectories,
  }));

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
                {health.totalRepos}
              </p>
            </div>
            <GitBranch className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Total Commits
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {health.hotspots.repositories
                  .reduce((sum, r) => sum + r.totalCommits, 0)
                  .toLocaleString()}
              </p>
            </div>
            <TrendingUp className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Total Files
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {health.hotspots.repositories
                  .reduce((sum, r) => sum + r.totalFiles, 0)
                  .toLocaleString()}
              </p>
            </div>
            <FileText className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Total Directories
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {health.hotspots.repositories
                  .reduce((sum, r) => sum + r.totalDirectories, 0)
                  .toLocaleString()}
              </p>
            </div>
            <Folder className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
      </div>

      {/* Repository Hotspots */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-5 h-5 text-orange-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Repository Hotspots - Which Projects Create the Most Churn
          </h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Repositories sorted by total commit activity. Click on a repository to see its top files
          and directories.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Commits per Repository
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={repoData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-gray-300 dark:stroke-gray-700"
                />
                <XAxis
                  dataKey="name"
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
                  formatter={(value: any, name: string) => {
                    if (name === 'commits') return [value.toLocaleString(), 'Commits'];
                    if (name === 'files') return [value.toLocaleString(), 'Files'];
                    if (name === 'directories') return [value.toLocaleString(), 'Directories'];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar
                  dataKey="commits"
                  fill="#f97316"
                  name="Commits"
                  onClick={(data: any) => {
                    const repo = health.hotspots.repositories.find(
                      (r) => r.repoName === data.name || r.repoName === data.fullName
                    );
                    setSelectedRepo(repo || null);
                  }}
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Repository List */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Repository Rankings
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {health.hotspots.repositories.map((repo, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedRepo(repo)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedRepo?.repoName === repo.repoName
                      ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-900/20 dark:border-indigo-700'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-gray-900 dark:border-gray-700 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          #{idx + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                          {repo.repoName}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>{repo.totalCommits.toLocaleString()} commits</span>
                        <span>{repo.totalFiles.toLocaleString()} files</span>
                        <span>{repo.totalDirectories.toLocaleString()} dirs</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Repository Details */}
        {selectedRepo && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Top Files & Directories in {selectedRepo.repoName}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Top Files
                </h4>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {selectedRepo.topFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded text-sm"
                    >
                      <span className="text-gray-700 dark:text-gray-300 font-mono truncate flex-1">
                        {file.file}
                      </span>
                      <span className="text-orange-600 dark:text-orange-400 font-semibold ml-4">
                        {file.commits}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Top Directories
                </h4>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {selectedRepo.topDirectories.map((dir, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded text-sm"
                    >
                      <span className="text-gray-700 dark:text-gray-300 font-mono truncate flex-1">
                        {dir.directory}
                      </span>
                      <span className="text-purple-600 dark:text-purple-400 font-semibold ml-4">
                        {dir.commits}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Aggregated File Hotspots */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-blue-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Top Files Across All Repositories
          </h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Files with the most commits across all repositories in this project.
        </p>
        {health.hotspots.aggregatedFiles.length > 0 ? (
          <div className="space-y-2">
            {health.hotspots.aggregatedFiles.slice(0, 30).map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 w-8">
                    #{idx + 1}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-mono truncate">
                    {file.file}
                  </span>
                </div>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 ml-4">
                  {file.commits.toLocaleString()} commits
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No file hotspot data available.</p>
        )}
      </div>

      {/* Aggregated Directory Hotspots */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Folder className="w-5 h-5 text-purple-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Top Directories Across All Repositories
          </h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Directories with the most commits across all repositories in this project.
        </p>
        {health.hotspots.aggregatedDirectories.length > 0 ? (
          <div className="space-y-2">
            {health.hotspots.aggregatedDirectories.slice(0, 30).map((dir, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 w-8">
                    #{idx + 1}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-mono truncate">
                    {dir.directory}
                  </span>
                </div>
                <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 ml-4">
                  {dir.commits.toLocaleString()} commits
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No directory hotspot data available.</p>
        )}
      </div>
    </div>
  );
}
