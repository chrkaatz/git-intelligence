import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from '@tanstack/react-router';
import { SocialNetworkAnalysis as SocialNetworkAnalysisComponent } from './SocialNetworkAnalysis';
import { getSocialNetworkAnalysis, type SocialNetworkAnalysis as SocialNetworkAnalysisType } from '../api';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

function getRepoName(path: string): string {
  try {
    const decoded = decodeURIComponent(path);
    const parts = decoded.split(/[/\\]/);
    return parts[parts.length - 1] || decoded;
  } catch {
    return path;
  }
}

export function SocialNetworkAnalysisView() {
  const params = useParams({ strict: false }) as { repoPath?: string };
  const repoPath = params?.repoPath;
  const [analysis, setAnalysis] = useState<SocialNetworkAnalysisType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showNotification, removeNotification } = useNotifications();
  const loadingNotificationIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchAnalysis = useCallback(
    async (refresh: boolean = false) => {
      if (!repoPath || isFetchingRef.current) return;

      isFetchingRef.current = true;
      setLoading(true);
      setError(null);

      const message = refresh
        ? 'Recalculating social network analysis... This may take a moment.'
        : 'Calculating social network analysis... This may take a moment.';
      const loadingId = showNotification('loading', message, 0);
      loadingNotificationIdRef.current = loadingId;

      try {
        const data = await getSocialNetworkAnalysis(repoPath, refresh);
        setAnalysis(data);
        // Remove loading notification and show success
        if (loadingNotificationIdRef.current) {
          removeNotification(loadingNotificationIdRef.current);
          loadingNotificationIdRef.current = null;
        }
        const successMessage = refresh
          ? 'Social network analysis recalculated successfully!'
          : 'Social network analysis calculated successfully!';
        showNotification('success', successMessage, 3000);
      } catch (err: any) {
        const errorMessage = err?.response?.data?.error || err?.message || 'Failed to load social network analysis';
        setError(errorMessage);
        // Remove loading notification and show error
        if (loadingNotificationIdRef.current) {
          removeNotification(loadingNotificationIdRef.current);
          loadingNotificationIdRef.current = null;
        }
        showNotification('error', errorMessage, 5000);
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
        loadingNotificationIdRef.current = null;
      }
    },
    [repoPath, showNotification, removeNotification]
  );

  useEffect(() => {
    fetchAnalysis(false);
  }, [fetchAnalysis]);

  const decodedPath = repoPath ? decodeURIComponent(repoPath) : null;
  const repoName = decodedPath ? getRepoName(decodedPath) : '';

  return (
    <>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Social / Organizational Network Analysis
          </h1>
          {repoPath && analysis && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5">{repoName}</p>
          )}
        </div>
        {repoPath && (
          <button
            onClick={() => fetchAnalysis(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Recalculating...' : 'Recalculate'}
          </button>
        )}
      </div>

      {loading && !analysis ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      ) : analysis ? (
        <SocialNetworkAnalysisComponent
          collaborationGraph={analysis.collaborationGraph}
          knowledgeSilos={analysis.knowledgeSilos}
          orphanedCode={analysis.orphanedCode}
        />
      ) : (
        <div className="text-center py-12 text-gray-500">
          No repository selected. Select a repository from the list to view social network analysis.
        </div>
      )}
    </>
  );
}

