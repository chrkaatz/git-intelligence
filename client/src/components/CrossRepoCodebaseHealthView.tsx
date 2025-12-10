import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from '@tanstack/react-router';
import { CrossRepoCodebaseHealth as CrossRepoCodebaseHealthComponent } from './CrossRepoCodebaseHealth';
import {
  getCrossRepoCodebaseHealth,
  type CrossRepoCodebaseHealth as CrossRepoCodebaseHealthType,
} from '../api';
import { Loader2, AlertCircle } from 'lucide-react';
import { RecalculateButton } from './common/RecalculateButton';
import { useNotifications } from '../context/NotificationContext';
import { useApp } from '../hooks/useApp';

export function CrossRepoCodebaseHealthView() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params?.projectId;
  const { projects } = useApp();
  const [health, setHealth] = useState<CrossRepoCodebaseHealthType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showNotification, removeNotification } = useNotifications();
  const loadingNotificationIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  // Get project name from ID
  const project = projectId ? projects.find((p) => p.id === projectId) : null;
  const projectName = project?.name || '';

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
      } catch (err: unknown) {
        const errorMessage =
          (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data
            ?.error ||
          (err as { message?: string })?.message ||
          'Failed to load cross-repo codebase health metrics';
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
          {projectId && projectName && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5">{projectName}</p>
          )}
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {projectId
              ? `Analyzing codebase health and hotspots across all repositories in this project`
              : 'Select a project to view cross-repo codebase health'}
          </p>
        </div>
        {projectId && <RecalculateButton loading={loading} onClick={() => fetchHealth(true)} />}
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
