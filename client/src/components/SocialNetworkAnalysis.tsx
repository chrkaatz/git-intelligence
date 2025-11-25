import { useState } from 'react';
import type { SocialNetworkAnalysis as SocialNetworkAnalysisType } from '../api';
import { Network, Users, FileText, Archive, AlertTriangle } from 'lucide-react';

interface SocialNetworkAnalysisProps {
  collaborationGraph: SocialNetworkAnalysisType['collaborationGraph'];
  knowledgeSilos: SocialNetworkAnalysisType['knowledgeSilos'];
  orphanedCode: SocialNetworkAnalysisType['orphanedCode'];
}

export function SocialNetworkAnalysis({
  collaborationGraph,
  knowledgeSilos,
  orphanedCode,
}: SocialNetworkAnalysisProps) {
  const [selectedSection, setSelectedSection] = useState<'collaboration' | 'silos' | 'orphaned'>('collaboration');

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

  return (
    <div className="space-y-6">
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
          Collaboration Graph
        </button>
        <button
          onClick={() => setSelectedSection('silos')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedSection === 'silos'
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}>
          <Users className="w-4 h-4 inline mr-2" />
          Knowledge Silos
        </button>
        <button
          onClick={() => setSelectedSection('orphaned')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedSection === 'orphaned'
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}>
          <Archive className="w-4 h-4 inline mr-2" />
          Orphaned Code
        </button>
      </div>

      {/* Collaboration Graph Section */}
      {selectedSection === 'collaboration' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Network className="w-5 h-5 text-indigo-500" />
              Collaboration Graph
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Network of authors who have collaborated on the same files. Nodes represent authors, edges represent shared file modifications.
            </p>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Authors</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{collaborationGraph.nodes.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Collaboration Edges</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{collaborationGraph.edges.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Author Clusters</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{collaborationGraph.clusters?.length || 0}</p>
            </div>
          </div>

          {/* Top Collaborators */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Top Collaborations</h3>
            {collaborationGraph.edges.length > 0 ? (
              <div className="space-y-3">
                {collaborationGraph.edges.slice(0, 20).map((edge, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-white">{edge.author1}</span>
                        <span className="text-gray-400">↔</span>
                        <span className="font-medium text-gray-900 dark:text-white">{edge.author2}</span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {edge.sharedFiles} shared file{edge.sharedFiles !== 1 ? 's' : ''}
                        {edge.sharedFilesList.length > 0 && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({edge.sharedFilesList.slice(0, 3).join(', ')}
                            {edge.sharedFilesList.length > 3 ? '...' : ''})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Strength</div>
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${edge.collaborationStrength * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No collaboration data available</p>
            )}
          </div>

          {/* Author Clusters */}
          {collaborationGraph.clusters && collaborationGraph.clusters.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Author Clusters</h3>
              <div className="space-y-3">
                {collaborationGraph.clusters.map((cluster) => (
                  <div
                    key={cluster.clusterId}
                    className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">Cluster {cluster.clusterId + 1}</h4>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{cluster.size} authors</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {cluster.authors.map((author, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-sm">
                          {author}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Knowledge Silos Section */}
      {selectedSection === 'silos' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-500" />
              Knowledge Silos
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Files or components only touched by 1-2 people, indicating potential knowledge silos and bus factor risk.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Files with Limited Contributors</h3>
            {knowledgeSilos.length > 0 ? (
              <div className="space-y-3">
                {knowledgeSilos.slice(0, 50).map((silo, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border ${
                      silo.riskLevel === 'high'
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        : silo.riskLevel === 'medium'
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                        : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-gray-900 dark:text-white">{silo.file}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              silo.riskLevel === 'high'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                : silo.riskLevel === 'medium'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                            }`}>
                            {getRiskLabel(silo.riskLevel)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {silo.authorCount} contributor{silo.authorCount !== 1 ? 's' : ''}: {silo.authors.join(', ')}
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                        <div>{silo.totalCommits} commits</div>
                        <div>{silo.daysSinceLastCommit} days ago</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No knowledge silos detected</p>
            )}
          </div>
        </div>
      )}

      {/* Orphaned Code Section */}
      {selectedSection === 'orphaned' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Archive className="w-5 h-5 text-red-500" />
              Orphaned Code
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Files that haven't been touched in 2+ years, indicating potentially dead or deprecated code.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Orphaned Files</h3>
            {orphanedCode.length > 0 ? (
              <div className="space-y-3">
                {orphanedCode.slice(0, 50).map((orphan, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border ${
                      orphan.riskLevel === 'high'
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        : orphan.riskLevel === 'medium'
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                        : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-gray-900 dark:text-white">{orphan.file}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              orphan.riskLevel === 'high'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                : orphan.riskLevel === 'medium'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                            }`}>
                            {getRiskLabel(orphan.riskLevel)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Last modified by {orphan.lastAuthor} ({orphan.daysSinceLastCommit} days ago)
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                        <div>{orphan.totalCommits} commits</div>
                        <div className="text-xs">{new Date(orphan.lastCommitDate).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No orphaned code detected</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

