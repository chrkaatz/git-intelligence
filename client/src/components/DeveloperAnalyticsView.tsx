import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from '@tanstack/react-router';
import { DeveloperAnalytics as DeveloperAnalyticsComponent } from './DeveloperAnalytics';
import {
  getDeveloperAnalytics,
  getStats,
  type DeveloperAnalytics as DeveloperAnalyticsType,
} from '../api';
import { Loader2, AlertCircle } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useApp } from '../context/AppContext';
import { RecalculateButton } from './common/RecalculateButton';

export function DeveloperAnalyticsView() {
  const params = useParams({ strict: false }) as { repoId?: string };
  const repoId = params?.repoId;
  const { repositories } = useApp();
  const [developerAnalytics, setDeveloperAnalytics] = useState<DeveloperAnalyticsType | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalLOC, setTotalLOC] = useState<number | null>(null);
  const { showNotification, removeNotification } = useNotifications();
  const loadingNotificationIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  // Get repository name from ID
  const repository = repoId ? repositories.find((r) => r.id === repoId) : null;
  const repoName = repository?.name || '';

  const fetchAnalytics = useCallback(
    async (refresh: boolean = false) => {
      if (!repoId) {
        setDeveloperAnalytics(null);
        return;
      }

      // Prevent duplicate fetches
      if (isFetchingRef.current) {
        return;
      }

      isFetchingRef.current = true;
      setAnalyticsLoading(true);
      setError(null);

      // Show loading notification
      const message = refresh
        ? 'Recalculating contributions overview... This may take a moment.'
        : 'Calculating contributions overview... This may take a moment.';
      const loadingId = showNotification('loading', message, 0);
      loadingNotificationIdRef.current = loadingId;

      try {
        // Use cache unless explicitly refreshing
        // Cache will automatically invalidate if repository has new commits (commit-hash-based)
        const [data, stats] = await Promise.all([
          getDeveloperAnalytics(repoId, refresh),
          getStats(repoId, refresh), // Respect refresh parameter - cache handles invalidation
        ]);
        setDeveloperAnalytics(data);

        // Get latest LOC from stats - ensure we get the most recent entry
        if (stats.locHistory && stats.locHistory.length > 0) {
          // Sort by date to ensure we get the latest entry (in case cache had unsorted data)
          const sortedHistory = [...stats.locHistory].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          const latestLOC = sortedHistory[sortedHistory.length - 1]?.loc || 0;
          setTotalLOC(latestLOC);
        } else {
          setTotalLOC(0);
        }

        // Remove loading notification and show success
        if (loadingNotificationIdRef.current) {
          removeNotification(loadingNotificationIdRef.current);
          loadingNotificationIdRef.current = null;
        }
        const successMessage = refresh
          ? 'Contributions overview recalculated successfully!'
          : 'Contributions overview calculated successfully!';
        showNotification('success', successMessage, 3000);
      } catch (err: unknown) {
        const errorMessage =
          (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data
            ?.error ||
          (err as { message?: string })?.message ||
          'Failed to load contributions overview';
        setError(errorMessage);
        // Remove loading notification and show error
        if (loadingNotificationIdRef.current) {
          removeNotification(loadingNotificationIdRef.current);
          loadingNotificationIdRef.current = null;
        }
        showNotification('error', errorMessage, 5000);
      } finally {
        setAnalyticsLoading(false);
        isFetchingRef.current = false;
      }
    },
    [repoId, showNotification, removeNotification]
  );

  useEffect(() => {
    fetchAnalytics(false);
  }, [fetchAnalytics]);

  return (
    <>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Contributions Overview
          </h1>
          {repoId && developerAnalytics && repoName && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5">{repoName}</p>
          )}
        </div>
        {repoId && (
          <RecalculateButton loading={analyticsLoading} onClick={() => fetchAnalytics(true)} />
        )}
      </div>

      {analyticsLoading && !developerAnalytics ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      ) : developerAnalytics ? (
        <DeveloperAnalyticsComponent
          authors={developerAnalytics.authors}
          longitudinalPatterns={developerAnalytics.longitudinalPatterns}
          totalLOC={totalLOC}
        />
      ) : (
        <div className="text-center py-12 text-gray-500">
          No repository selected. Select a repository from the list to view contributions overview.
        </div>
      )}
    </>
  );
}
