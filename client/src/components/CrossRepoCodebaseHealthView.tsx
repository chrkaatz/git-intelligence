import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from '@tanstack/react-router';
import { CrossRepoCodebaseHealth as CrossRepoCodebaseHealthComponent } from './CrossRepoCodebaseHealth';
import {
  getCrossRepoCodebaseHealth,
  type CrossRepoCodebaseHealth as CrossRepoCodebaseHealthType,
} from '../api';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export function CrossRepoCodebaseHealthView() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params?.projectId;
  const [health, setHealth] = useState<CrossRepoCodebaseHealthType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showNotification, removeNotification } = useNotifications();
  const loadingNotificationIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchHealth = useCallback(
    async (refresh: boolean = false) => {
      if (!projectId) {
        setHealth(null);
        return;
      }

      // Prevent duplicate fetches
      if (isFetchingRef.current) {
        return;
      }

      isFetchingRef.current = true;
      setLoading(true);
      setError(null);

      // Show loading notification
      const message = refresh
        ? 'Recalculating cross-repo codebase health across all repositories... This may take a while.'
        : 'Calculating cross-repo codebase health across all repositories... This may take a while.';
      const loadingId = showNotification('loading', message, 0);
      loadingNotificationIdRef.current = loadingId;

      try {
        const data = await getCrossRepoCodebaseHealth(projectId, refresh);
        setHealth(data);
        // Remove loading notification and show success
        if (loadingNotificationIdRef.current) {
          removeNotification(loadingNotificationIdRef.current);
          loadingNotificationIdRef.current = null;
        }
        const successMessage = refresh
          ? `Cross-repo codebase health recalculated for ${data.totalRepos} repositories!`
          : `Cross-repo codebase health calculated for ${data.totalRepos} repositories!`;
        showNotification('success', successMessage, 3000);
      } catch (err) {
        const errorMessage = 'Failed to load cross-repo codebase health metrics';
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
    [projectId, showNotification, removeNotification]
  );

  useEffect(() => {
    fetchHealth(false);
  }, [fetchHealth]);

  return (
    <>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Cross-Repo Codebase Health
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {projectId
              ? `Analyzing codebase health and hotspots across all repositories in this project`
              : 'Select a project to view cross-repo codebase health'}
          </p>
        </div>
        {projectId && (
          <button
            onClick={() => fetchHealth(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Recalculating...' : 'Recalculate'}
          </button>
        )}
      </div>

      {loading && !health ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      ) : health ? (
        <CrossRepoCodebaseHealthComponent health={health} loading={loading} />
      ) : (
        <div className="text-center py-12 text-gray-500">
          No project selected. Select a project from the list to view cross-repo codebase health.
        </div>
      )}
    </>
  );
}
