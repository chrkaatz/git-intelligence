import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from '@tanstack/react-router';
import { TechnicalDebtIndicators as TechnicalDebtIndicatorsComponent } from './TechnicalDebtIndicators';
import {
  getTechnicalDebtIndicatorsStatus,
  type TechnicalDebtIndicators as TechnicalDebtIndicatorsType,
} from '../api';
import { Loader2, AlertCircle } from 'lucide-react';
import { RecalculateButton } from './common/RecalculateButton';
import { useNotifications } from '../context/NotificationContext';
import { useApp } from '../context/AppContext';

export function TechnicalDebtIndicatorsView() {
  const params = useParams({ strict: false }) as { repoId?: string };
  const repoId = params?.repoId;
  const { repositories } = useApp();
  const [indicators, setIndicators] = useState<TechnicalDebtIndicatorsType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ progress: number; step?: string } | null>(null);
  const { showNotification, removeNotification, updateNotification } = useNotifications();
  const loadingNotificationIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get repository name from ID
  const repository = repoId ? repositories.find((r) => r.id === repoId) : null;
  const repoName = repository?.name || '';

  const fetchIndicators = useCallback(
    async (refresh: boolean = false) => {
      if (!repoId) {
        setIndicators(null);
        return;
      }

      // Prevent duplicate fetches
      if (isFetchingRef.current) {
        return;
      }

      isFetchingRef.current = true;
      setLoading(true);
      setError(null);
      setProgress(null);

      // Show loading notification
      const message = refresh
        ? 'Recalculating technical debt indicators... This may take a moment.'
        : 'Calculating technical debt indicators... This may take a moment.';
      const loadingId = showNotification('loading', message, 0);
      loadingNotificationIdRef.current = loadingId;

      try {
        // Start the job or get cached result
        const jobResponse = await fetch(
          `http://localhost:3001/technical-debt-indicators?repoId=${repoId}&refresh=${refresh ? 'true' : 'false'}`
        );
        const responseData = await jobResponse.json();

        // If response has jobId, it's a new job - poll for progress
        // If response has indicators directly, it's cached - use it immediately
        if (responseData.jobId) {
          const { jobId } = responseData;

          // Poll for progress
          const pollStatus = async () => {
            try {
              const status = await getTechnicalDebtIndicatorsStatus(jobId);

              setProgress({
                progress: status.progress,
                step: status.currentStep,
              });

              // Update notification with progress
              if (loadingNotificationIdRef.current && status.currentStep) {
                const progressMessage = `${status.currentStep} (${Math.round(status.progress)}%)`;
                updateNotification(loadingNotificationIdRef.current, 'loading', progressMessage, 0);
              }

              if (status.status === 'completed' && status.result) {
                if (pollIntervalRef.current) {
                  clearInterval(pollIntervalRef.current);
                  pollIntervalRef.current = null;
                }
                setIndicators(status.result);
                setProgress(null);
                // Remove loading notification and show success
                if (loadingNotificationIdRef.current) {
                  removeNotification(loadingNotificationIdRef.current);
                  loadingNotificationIdRef.current = null;
                }
                const successMessage = refresh
                  ? 'Technical debt indicators recalculated successfully!'
                  : 'Technical debt indicators calculated successfully!';
                showNotification('success', successMessage, 3000);
                isFetchingRef.current = false;
                setLoading(false);
              } else if (status.status === 'failed') {
                if (pollIntervalRef.current) {
                  clearInterval(pollIntervalRef.current);
                  pollIntervalRef.current = null;
                }
                const errorMessage = status.error || 'Failed to load technical debt indicators';
                setError(errorMessage);
                setProgress(null);
                // Remove loading notification and show error
                if (loadingNotificationIdRef.current) {
                  removeNotification(loadingNotificationIdRef.current);
                  loadingNotificationIdRef.current = null;
                }
                showNotification('error', errorMessage, 5000);
                isFetchingRef.current = false;
                setLoading(false);
              }
            } catch {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              const errorMessage = 'Failed to load technical debt indicators';
              setError(errorMessage);
              setProgress(null);
              if (loadingNotificationIdRef.current) {
                removeNotification(loadingNotificationIdRef.current);
                loadingNotificationIdRef.current = null;
              }
              showNotification('error', errorMessage, 5000);
              isFetchingRef.current = false;
              setLoading(false);
            }
          };

          // Poll immediately, then every second
          pollStatus();
          pollIntervalRef.current = setInterval(pollStatus, 1000);

          // Timeout after 5 minutes
          setTimeout(() => {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            if (isFetchingRef.current) {
              isFetchingRef.current = false;
              setLoading(false);
              setError('Analysis timeout - this may take longer than expected');
              if (loadingNotificationIdRef.current) {
                removeNotification(loadingNotificationIdRef.current);
                loadingNotificationIdRef.current = null;
              }
              showNotification('error', 'Analysis timeout', 5000);
            }
          }, 300000);
        } else {
          // Cached result returned immediately
          setIndicators(responseData);
          setProgress(null);
          if (loadingNotificationIdRef.current) {
            removeNotification(loadingNotificationIdRef.current);
            loadingNotificationIdRef.current = null;
          }
          showNotification('success', 'Technical debt indicators loaded from cache', 3000);
          isFetchingRef.current = false;
          setLoading(false);
        }
      } catch {
        const errorMessage = 'Failed to start technical debt analysis';
        setError(errorMessage);
        setProgress(null);
        if (loadingNotificationIdRef.current) {
          removeNotification(loadingNotificationIdRef.current);
          loadingNotificationIdRef.current = null;
        }
        showNotification('error', errorMessage, 5000);
        isFetchingRef.current = false;
        setLoading(false);
      }
    },
    [repoId, showNotification, removeNotification, updateNotification]
  );

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Fetch indicators on mount
    if (repoId) {
      fetchIndicators(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoId]); // Only depend on repoId, not fetchIndicators to avoid re-fetching

  return (
    <>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Technical Debt Indicators
          </h1>
          {repoId && indicators && repoName && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5">{repoName}</p>
          )}
        </div>
        {repoId && <RecalculateButton loading={loading} onClick={() => fetchIndicators(true)} />}
      </div>

      {loading && !indicators ? (
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          {progress && (
            <div className="w-full max-w-md space-y-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>{progress.step || 'Processing...'}</span>
                <span>{Math.round(progress.progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 dark:bg-blue-500"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      ) : indicators ? (
        <TechnicalDebtIndicatorsComponent indicators={indicators} />
      ) : (
        <div className="text-center py-12 text-gray-500">
          No repository selected. Select a repository from the list to view technical debt
          indicators.
        </div>
      )}
    </>
  );
}
