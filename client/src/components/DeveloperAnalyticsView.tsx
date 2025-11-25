import { useEffect, useState, useRef } from 'react';
import { useParams } from '@tanstack/react-router';
import { DeveloperAnalytics as DeveloperAnalyticsComponent } from './DeveloperAnalytics';
import { getDeveloperAnalytics, type DeveloperAnalytics as DeveloperAnalyticsType } from '../api';
import { Loader2, AlertCircle } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export function DeveloperAnalyticsView() {
  const params = useParams({ strict: false }) as { repoPath?: string };
  const repoPath = params?.repoPath;
  const [developerAnalytics, setDeveloperAnalytics] = useState<DeveloperAnalyticsType | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showNotification, removeNotification } = useNotifications();
  const loadingNotificationIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (!repoPath) {
      setDeveloperAnalytics(null);
      return;
    }

    // Prevent duplicate fetches
    if (isFetchingRef.current) {
      return;
    }

    const decodedPath = decodeURIComponent(repoPath);
    const fetchAnalytics = async () => {
      isFetchingRef.current = true;
      setAnalyticsLoading(true);
      setError(null);

      // Show loading notification
      const loadingId = showNotification('loading', 'Calculating developer analytics... This may take a moment.', 0);
      loadingNotificationIdRef.current = loadingId;

      try {
        const data = await getDeveloperAnalytics(decodedPath);
        setDeveloperAnalytics(data);
        // Remove loading notification and show success
        if (loadingNotificationIdRef.current) {
          removeNotification(loadingNotificationIdRef.current);
          loadingNotificationIdRef.current = null;
        }
        showNotification('success', 'Developer analytics calculated successfully!', 3000);
      } catch (err) {
        const errorMessage = 'Failed to load developer analytics';
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
    };

    fetchAnalytics();
  }, [repoPath]);

  const decodedPath = repoPath ? decodeURIComponent(repoPath) : '';
  // Extract repository name from path for cleaner display
  const getRepoName = (path: string) => {
    const parts = path.split('/');
    return parts[parts.length - 1] || path;
  };
  const repoName = decodedPath ? getRepoName(decodedPath) : '';

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Developer Analytics
        </h1>
        {repoPath && developerAnalytics && (
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5">
            {repoName}
          </p>
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
        />
      ) : (
        <div className="text-center py-12 text-gray-500">
          No repository selected. Select a repository from the list to view developer analytics.
        </div>
      )}
    </>
  );
}

