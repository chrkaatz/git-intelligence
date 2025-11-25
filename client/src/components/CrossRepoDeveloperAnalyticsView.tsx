import { useEffect, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { CrossRepoDeveloperAnalytics as CrossRepoDeveloperAnalyticsComponent } from './CrossRepoDeveloperAnalytics';
import { getCrossRepoDeveloperAnalytics, type CrossRepoDeveloperAnalytics as CrossRepoDeveloperAnalyticsType } from '../api';
import { Loader2, AlertCircle } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export function CrossRepoDeveloperAnalyticsView() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params?.projectId;
  const [analytics, setAnalytics] = useState<CrossRepoDeveloperAnalyticsType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showNotification, removeNotification } = useNotifications();

  useEffect(() => {
    if (!projectId) {
      setAnalytics(null);
      return;
    }

    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);

      // Show loading notification
      const loadingId = showNotification('loading', 'Calculating cross-repo analytics across all repositories... This may take a while.', 0);

      try {
        const data = await getCrossRepoDeveloperAnalytics(projectId);
        setAnalytics(data);
        // Remove loading notification and show success
        removeNotification(loadingId);
        showNotification('success', `Cross-repo analytics calculated for ${data.totalRepos} repositories!`, 3000);
      } catch (err) {
        const errorMessage = 'Failed to load cross-repo developer analytics';
        setError(errorMessage);
        // Remove loading notification and show error
        removeNotification(loadingId);
        showNotification('error', errorMessage, 5000);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [projectId, showNotification]);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Cross-Repo Developer Analytics
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {projectId
            ? `Analyzing developer contributions across all repositories in this project`
            : 'Select a project to view cross-repo developer analytics'}
        </p>
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
        <CrossRepoDeveloperAnalyticsComponent analytics={analytics} loading={loading} />
      ) : (
        <div className="text-center py-12 text-gray-500">
          No project selected. Select a project from the list to view cross-repo developer analytics.
        </div>
      )}
    </>
  );
}

