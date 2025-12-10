import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from '@tanstack/react-router';
import { BusFactorAndOwnership as BusFactorAndOwnershipComponent } from './BusFactorAndOwnership';
import {
  getBusFactorAndOwnership,
  type BusFactorAndOwnership as BusFactorAndOwnershipType,
} from '../../api';
import { Loader2, AlertCircle } from 'lucide-react';
import { RecalculateButton } from '../common/RecalculateButton';
import { useNotifications } from '../../context/NotificationContext';
import { useApp } from '../../hooks/useApp';

export function BusFactorAndOwnershipView() {
  const params = useParams({ strict: false }) as { repoId?: string };
  const repoId = params?.repoId;
  const { repositories } = useApp();
  const [analytics, setAnalytics] = useState<BusFactorAndOwnershipType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showNotification, removeNotification } = useNotifications();
  const loadingNotificationIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  // Get repository name from ID
  const repository = repoId ? repositories.find((r) => r.id === repoId) : null;
  const repoName = repository?.name || '';

  const fetchAnalytics = useCallback(
    async (refresh: boolean = false) => {
      if (!repoId) {
        setAnalytics(null);
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
        ? 'Recalculating bus factor and ownership analytics... This may take a moment.'
        : 'Calculating bus factor and ownership analytics... This may take a moment.';
      const loadingId = showNotification('loading', message, 0);
      loadingNotificationIdRef.current = loadingId;

      try {
        const data = await getBusFactorAndOwnership(repoId, refresh);
        setAnalytics(data);
        // Remove loading notification and show success
        if (loadingNotificationIdRef.current) {
          removeNotification(loadingNotificationIdRef.current);
          loadingNotificationIdRef.current = null;
        }
        const successMessage = refresh
          ? 'Bus factor and ownership analytics recalculated successfully!'
          : 'Bus factor and ownership analytics calculated successfully!';
        showNotification('success', successMessage, 3000);
      } catch (err: unknown) {
        const errorMessage =
          (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data
            ?.error ||
          (err as { message?: string })?.message ||
          'Failed to load bus factor and ownership analytics';
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
            Bus Factor & Ownership Analytics
          </h1>
          {repoId && analytics && repoName && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5">{repoName}</p>
          )}
        </div>
        {repoId && <RecalculateButton loading={loading} onClick={() => fetchAnalytics(true)} />}
      </div>

      {loading && !analytics ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      ) : analytics ? (
        <BusFactorAndOwnershipComponent
          singleMaintainerRisk={analytics.singleMaintainerRisk}
          fragmentation={analytics.fragmentation}
          ownerChurn={analytics.ownerChurn}
        />
      ) : (
        <div className="text-center py-12 text-gray-500">
          No repository selected. Select a repository from the list to view bus factor and ownership
          analytics.
        </div>
      )}
    </>
  );
}
