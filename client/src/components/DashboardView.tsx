import { useEffect, useState, useRef } from 'react';
import { useParams } from '@tanstack/react-router';
import { SummaryCards } from './SummaryCards';
import { ActivityChart } from './ActivityChart';
import { AuthorList } from './AuthorList';
import { ExtensionChart } from './ExtensionChart';
import { LocChart } from './LocChart';
import { getStats, type GitStats } from '../api';
import { Loader2, AlertCircle } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useApp } from '../context/AppContext';

export function DashboardView() {
  const params = useParams({ strict: false }) as { repoId?: string };
  const repoId = params?.repoId;
  const { repositories } = useApp();
  const [stats, setStats] = useState<GitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showNotification, removeNotification } = useNotifications();
  const loadingNotificationIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  // Get repository name from ID
  const repository = repoId ? repositories.find((r) => r.id === repoId) : null;
  const repoName = repository?.name || '';

  useEffect(() => {
    if (!repoId) {
      setLoading(false);
      setStats(null);
      return;
    }

    // Prevent duplicate fetches
    if (isFetchingRef.current) {
      return;
    }

    const fetchStats = async () => {
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);

      // Show loading notification
      const loadingId = showNotification('loading', 'Analyzing repository statistics...', 0);
      loadingNotificationIdRef.current = loadingId;

      try {
        const data = await getStats(repoId);
        setStats(data);
        // Remove loading notification and show success
        if (loadingNotificationIdRef.current) {
          removeNotification(loadingNotificationIdRef.current);
          loadingNotificationIdRef.current = null;
        }
        showNotification('success', 'Repository statistics loaded successfully!', 3000);
      } catch (err: unknown) {
        const errorMessage =
          (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data
            ?.error ||
          (err as { message?: string })?.message ||
          'Failed to load repository statistics';
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
    };

    fetchStats();
  }, [repoId, showNotification, removeNotification]);

  if (!repoId) {
    return (
      <>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Select a repository to view statistics
          </p>
        </div>
        <div className="text-center py-12 text-gray-500">
          No repository selected. Select a repository from the list to view statistics.
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
        {repoId && stats && repoName && (
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5">{repoName}</p>
        )}
      </div>

      {loading && !stats ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      ) : stats ? (
        <>
          <SummaryCards stats={stats} />
          <LocChart data={stats.locHistory} />
          <ActivityChart activity={stats.activity} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AuthorList authors={stats.authors} />
            </div>
            <div>
              <ExtensionChart extensions={stats.extensions} />
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-500">
          No repository selected. Select a repository from the list to view statistics.
        </div>
      )}
    </>
  );
}
