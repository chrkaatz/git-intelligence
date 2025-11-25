import { useEffect, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { DeveloperAnalytics as DeveloperAnalyticsComponent } from './DeveloperAnalytics';
import { getDeveloperAnalytics, type DeveloperAnalytics as DeveloperAnalyticsType } from '../api';
import { Loader2, AlertCircle } from 'lucide-react';

export function DeveloperAnalyticsView() {
  const params = useParams({ strict: false }) as { repoPath?: string };
  const repoPath = params?.repoPath;
  const [developerAnalytics, setDeveloperAnalytics] = useState<DeveloperAnalyticsType | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repoPath) {
      setDeveloperAnalytics(null);
      return;
    }

    const decodedPath = decodeURIComponent(repoPath);
    const fetchAnalytics = async () => {
      setAnalyticsLoading(true);
      setError(null);
      try {
        const data = await getDeveloperAnalytics(decodedPath);
        setDeveloperAnalytics(data);
      } catch (err) {
        setError('Failed to load developer analytics');
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
  }, [repoPath]);

  const decodedPath = repoPath ? decodeURIComponent(repoPath) : '';

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Developer Analytics
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {repoPath
            ? `Analyzing developer contributions for ${decodedPath}`
            : 'Select a repository to view developer analytics'}
        </p>
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

