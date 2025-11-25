import { useState } from 'react';
import type { CrossRepoSocialNetworkAnalysis as CrossRepoSocialNetworkAnalysisType } from '../api';
import { Network, FolderTree, Users } from 'lucide-react';

interface CrossRepoSocialNetworkAnalysisProps {
  analytics: CrossRepoSocialNetworkAnalysisType;
  loading?: boolean;
}

export function CrossRepoSocialNetworkAnalysis({
  analytics,
  loading,
}: CrossRepoSocialNetworkAnalysisProps) {
  const [selectedSection, setSelectedSection] = useState<'collaboration' | 'clusters'>('collaboration');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Analyzing cross-repo social networks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Repositories</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.totalRepos}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Cross-Repo Collaborations</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.crossRepoCollaboration.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Repository Clusters</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.repoClusters.length}</p>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-4">
        <button
          onClick={() => setSelectedSection('collaboration')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedSection === 'collaboration'
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}>
          <Network className="w-4 h-4 inline mr-2" />
          Cross-Repo Collaboration
        </button>
        <button
          onClick={() => setSelectedSection('clusters')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedSection === 'clusters'
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}>
          <FolderTree className="w-4 h-4 inline mr-2" />
          Repository Clusters
        </button>
      </div>

      {/* Cross-Repo Collaboration Section */}
      {selectedSection === 'collaboration' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Network className="w-5 h-5 text-indigo-500" />
              Cross-Repo Collaboration
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Authors who work across multiple repositories, showing natural team boundaries and knowledge sharing patterns.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Collaboration Pairs</h3>
            {analytics.crossRepoCollaboration.length > 0 ? (
              <div className="space-y-3">
                {analytics.crossRepoCollaboration.slice(0, 50).map((collab, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-900 dark:text-white">{collab.author1}</span>
                        <span className="text-gray-400">↔</span>
                        <span className="font-medium text-gray-900 dark:text-white">{collab.author2}</span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <div className="mb-1">
                          {collab.sharedReposCount} shared repositor{collab.sharedReposCount !== 1 ? 'ies' : 'y'}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {collab.sharedRepos.map((repo, repoIdx) => (
                            <span
                              key={repoIdx}
                              className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-xs">
                              {repo}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Strength</div>
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${collab.collaborationStrength * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No cross-repo collaborations detected. Authors may be working in isolated repositories.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Repository Clusters Section */}
      {selectedSection === 'clusters' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-indigo-500" />
              Repository Clusters
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Groups of repositories worked on by the same set of authors, indicating natural team boundaries and Conway's Law patterns.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Repository Groups</h3>
            {analytics.repoClusters.length > 0 ? (
              <div className="space-y-4">
                {analytics.repoClusters.map((cluster) => (
                  <div
                    key={cluster.clusterId}
                    className="p-5 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900 dark:text-white text-lg">Cluster {cluster.clusterId + 1}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>{cluster.size} repos</span>
                        <span>{cluster.authors.length} authors</span>
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Repositories:</div>
                      <div className="flex flex-wrap gap-2">
                        {cluster.repos.map((repo, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-sm font-medium">
                            {repo}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Authors:</div>
                      <div className="flex flex-wrap gap-2">
                        {cluster.authors.map((author, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">
                            {author}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No repository clusters detected. Repositories may have distinct author sets.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

