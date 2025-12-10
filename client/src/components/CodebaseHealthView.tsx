import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from '@tanstack/react-router';
import { CodebaseHealth as CodebaseHealthComponent } from './CodebaseHealth';
import { getCodebaseHealth, type CodebaseHealth as CodebaseHealthType } from '../api';
import { Loader2, AlertCircle } from 'lucide-react';
import { RecalculateButton } from './common/RecalculateButton';
import { useNotifications } from '../context/NotificationContext';
import { useApp } from '../hooks/useApp';

export function CodebaseHealthView() {
  const params = useParams({ strict: false }) as { repoId?: string };
  const repoId = params?.repoId;
  const { repositories } = useApp();
  const [codebaseHealth, setCodebaseHealth] = useState<CodebaseHealthType | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showNotification, removeNotification } = useNotifications();
  const loadingNotificationIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  // Get repository name from ID
  const repository = repoId ? repositories.find((r) => r.id === repoId) : null;
  const repoName = repository?.name || '';

  const fetchHealth = useCallback(
    async (refresh: boolean = false) => {
      if (!repoId) {
        setCodebaseHealth(null);
        return;
      }

      // Prevent duplicate fetches
      if (isFetchingRef.current) {
        return;
      }

      isFetchingRef.current = true;
      setHealthLoading(true);
      setError(null);

      // Show loading notification
      const message = refresh
        ? 'Recalculating codebase health metrics... This may take a moment.'
        : 'Calculating codebase health metrics... This may take a moment.';
      const loadingId = showNotification('loading', message, 0);
      loadingNotificationIdRef.current = loadingId;

      try {
        const data = await getCodebaseHealth(repoId, refresh);
        setCodebaseHealth(data);
        // Remove loading notification and show success
        if (loadingNotificationIdRef.current) {
          removeNotification(loadingNotificationIdRef.current);
          loadingNotificationIdRef.current = null;
        }
        const successMessage = refresh
          ? 'Codebase health metrics recalculated successfully!'
          : 'Codebase health metrics calculated successfully!';
        showNotification('success', successMessage, 3000);
      } catch (err: unknown) {
        const errorMessage =
          (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data
            ?.error ||
          (err as { message?: string })?.message ||
          'Failed to load codebase health metrics';
        setError(errorMessage);
        // Remove loading notification and show error
        if (loadingNotificationIdRef.current) {
          removeNotification(loadingNotificationIdRef.current);
          loadingNotificationIdRef.current = null;
        }
        showNotification('error', errorMessage, 5000);
      } finally {
        setHealthLoading(false);
        isFetchingRef.current = false;
      }
    },
    [repoId, showNotification, removeNotification]
  );

  useEffect(() => {
    fetchHealth(false);
  }, [fetchHealth]);

  return (
    <>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Codebase Health & Architecture Signals
          </h1>
          {repoId && codebaseHealth && repoName && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5">{repoName}</p>
          )}
        </div>
        {repoId && <RecalculateButton loading={healthLoading} onClick={() => fetchHealth(true)} />}
      </div>

      {healthLoading && !codebaseHealth ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      ) : codebaseHealth ? (
        <CodebaseHealthComponent
          hotspots={codebaseHealth.hotspots}
          changeCoupling={codebaseHealth.changeCoupling}
          stability={codebaseHealth.stability}
          complexity={codebaseHealth.complexity}
          hygiene={codebaseHealth.hygiene}
        />
      ) : (
        <div className="text-center py-12 text-gray-500">
          No repository selected. Select a repository from the list to view codebase health metrics.
        </div>
      )}
    </>
  );
}
