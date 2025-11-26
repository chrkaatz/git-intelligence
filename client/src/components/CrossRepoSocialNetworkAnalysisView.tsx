import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from '@tanstack/react-router';
import { CrossRepoSocialNetworkAnalysis as CrossRepoSocialNetworkAnalysisComponent } from './CrossRepoSocialNetworkAnalysis';
import {
  getCrossRepoSocialNetworkAnalysis,
  type CrossRepoSocialNetworkAnalysis as CrossRepoSocialNetworkAnalysisType,
} from '../api';
import { Loader2, AlertCircle } from 'lucide-react';
import { RecalculateButton } from './common/RecalculateButton';
import { useNotifications } from '../context/NotificationContext';

export function CrossRepoSocialNetworkAnalysisView() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params?.projectId;
  const [analytics, setAnalytics] = useState<CrossRepoSocialNetworkAnalysisType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showNotification, removeNotification } = useNotifications();
  const loadingNotificationIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchAnalytics = useCallback(
    async (refresh: boolean = false) => {
      if (!projectId || isFetchingRef.current) return;

      isFetchingRef.current = true;
      setLoading(true);
      setError(null);

      const message = refresh
        ? 'Recalculating cross-repo social network analysis... This may take a while.'
        : 'Calculating cross-repo social network analysis across all repositories... This may take a while.';
      const loadingId = showNotification('loading', message, 0);
      loadingNotificationIdRef.current = loadingId;

      try {
        const data = await getCrossRepoSocialNetworkAnalysis(projectId, refresh);
        setAnalytics(data);
        // Remove loading notification and show success
        if (loadingNotificationIdRef.current) {
          removeNotification(loadingNotificationIdRef.current);
          loadingNotificationIdRef.current = null;
        }
        const successMessage = refresh
          ? 'Cross-repo social network analysis recalculated successfully!'
          : `Cross-repo social network analysis calculated for ${data.totalRepos} repositories!`;
        showNotification('success', successMessage, 3000);
      } catch (err: unknown) {
        const errorMessage =
          (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data
            ?.error ||
          (err as { message?: string })?.message ||
          'Failed to load cross-repo social network analysis';
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
    [projectId, showNotification, removeNotification]
  );

  useEffect(() => {
    fetchAnalytics(false);
  }, [fetchAnalytics]);

  return (
    <>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Social / Organizational Network Analysis (Cross-Repo)
          </h1>
          {projectId && analytics && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5">
              Analyzing {analytics.totalRepos} repositories
            </p>
          )}
        </div>
        {projectId && <RecalculateButton loading={loading} onClick={() => fetchAnalytics(true)} />}
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
        <CrossRepoSocialNetworkAnalysisComponent analytics={analytics} loading={loading} />
      ) : (
        <div className="text-center py-12 text-gray-500">
          No project selected. Select a project to view cross-repo social network analysis.
        </div>
      )}
    </>
  );
}
