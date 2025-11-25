import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from '@tanstack/react-router';
import { RepositoryEvolution as RepositoryEvolutionComponent } from './RepositoryEvolution';
import {
  getRepositoryEvolution,
  type RepositoryEvolution as RepositoryEvolutionType,
} from '../api';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export function RepositoryEvolutionView() {
  const params = useParams({ strict: false }) as { repoPath?: string };
  const repoPath = params?.repoPath;
  const [evolution, setEvolution] = useState<RepositoryEvolutionType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showNotification, removeNotification } = useNotifications();
  const loadingNotificationIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchEvolution = useCallback(
    async (refresh: boolean = false) => {
      if (!repoPath) {
        setEvolution(null);
        return;
      }

      // Prevent duplicate fetches
      if (isFetchingRef.current) {
        return;
      }

      const decodedPath = decodeURIComponent(repoPath);
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);

      // Show loading notification
      const message = refresh
        ? 'Recalculating repository evolution metrics... This may take a moment.'
        : 'Calculating repository evolution metrics... This may take a moment.';
      const loadingId = showNotification('loading', message, 0);
      loadingNotificationIdRef.current = loadingId;

      try {
        const data = await getRepositoryEvolution(decodedPath, refresh);
        setEvolution(data);
        // Remove loading notification and show success
        if (loadingNotificationIdRef.current) {
          removeNotification(loadingNotificationIdRef.current);
          loadingNotificationIdRef.current = null;
        }
        const successMessage = refresh
          ? 'Repository evolution metrics recalculated successfully!'
          : 'Repository evolution metrics calculated successfully!';
        showNotification('success', successMessage, 3000);
      } catch (err) {
        const errorMessage = 'Failed to load repository evolution metrics';
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
      }
    },
    [repoPath, showNotification, removeNotification]
  );

  useEffect(() => {
    fetchEvolution(false);
  }, [fetchEvolution]);

  const decodedPath = repoPath ? decodeURIComponent(repoPath) : '';
  // Extract repository name from path for cleaner display
  const getRepoName = (path: string) => {
    const parts = path.split('/');
    return parts[parts.length - 1] || path;
  };
  const repoName = decodedPath ? getRepoName(decodedPath) : '';

  return (
    <>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Repository Evolution</h1>
          {repoPath && evolution && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5">{repoName}</p>
          )}
        </div>
        {repoPath && (
          <button
            onClick={() => fetchEvolution(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Recalculating...' : 'Recalculate'}
          </button>
        )}
      </div>

      {loading && !evolution ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      ) : evolution ? (
        <RepositoryEvolutionComponent evolution={evolution} loading={loading} />
      ) : (
        <div className="text-center py-12 text-gray-500">
          No repository selected. Select a repository from the list to view repository evolution
          analytics.
        </div>
      )}
    </>
  );
}
