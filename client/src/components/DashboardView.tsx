import { useEffect, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { SummaryCards } from './SummaryCards';
import { ActivityChart } from './ActivityChart';
import { AuthorList } from './AuthorList';
import { ExtensionChart } from './ExtensionChart';
import { LocChart } from './LocChart';
import { getStats, type GitStats } from '../api';
import { Loader2, AlertCircle } from 'lucide-react';

export function DashboardView() {
  const params = useParams({ strict: false }) as { repoPath?: string };
  const repoPath = params?.repoPath;
  const [stats, setStats] = useState<GitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repoPath) {
      setLoading(false);
      setStats(null);
      return;
    }

    const decodedPath = decodeURIComponent(repoPath);
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getStats(decodedPath);
        setStats(data);
      } catch (err) {
        setError('Failed to load repository statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [repoPath]);

  if (!repoPath) {
    return (
      <>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
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

  const decodedPath = decodeURIComponent(repoPath);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Analyzing {decodedPath}
        </p>
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

