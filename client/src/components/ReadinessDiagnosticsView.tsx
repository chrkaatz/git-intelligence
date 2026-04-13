import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from '@tanstack/react-router';
import {
  getReadinessDiagnostics,
  getOllamaSettings,
  type ReadinessDiagnostics as ReadinessDiagnosticsType,
} from '../api';
import { ReadinessDiagnosticsDisplay } from './ReadinessDiagnosticsDisplay';
import { Loader2, AlertCircle } from 'lucide-react';
import { RecalculateButton } from './common/RecalculateButton';
import { useNotifications } from '../context/NotificationContext';
import { useApp } from '../hooks/useApp';
import { AIInsightsPanel } from './AIInsightsPanel';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function ReadinessDiagnosticsView() {
  const params = useParams({ strict: false }) as { repoId?: string };
  const repoId = params?.repoId;
  const { repositories } = useApp();
  const [data, setData] = useState<ReadinessDiagnosticsType | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);
  const [aiInsightsError, setAiInsightsError] = useState<string | null>(null);
  const [ollamaEnabled, setOllamaEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showNotification, removeNotification } = useNotifications();
  const loadingNotificationIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);
  const isFetchingAIInsightsRef = useRef(false);

  const repository = repoId ? repositories.find((r) => r.id === repoId) : null;
  const repoName = repository?.name || '';

  const fetchData = useCallback(
    async (refresh: boolean = false) => {
      if (!repoId) {
        setData(null);
        return;
      }
      if (isFetchingRef.current) return;

      isFetchingRef.current = true;
      setLoading(true);
      setError(null);

      const message = refresh
        ? 'Recalculating readiness diagnostics...'
        : 'Loading readiness diagnostics...';
      const loadingId = showNotification('loading', message, 0);
      loadingNotificationIdRef.current = loadingId;

      try {
        const result = await getReadinessDiagnostics(repoId, refresh);
        setData(result);
        if (loadingNotificationIdRef.current) {
          removeNotification(loadingNotificationIdRef.current);
          loadingNotificationIdRef.current = null;
        }
        showNotification(
          'success',
          refresh ? 'Readiness diagnostics recalculated.' : 'Readiness diagnostics loaded.',
          3000
        );
      } catch (err: unknown) {
        const errorMessage =
          (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data
            ?.error ||
          (err as { message?: string })?.message ||
          'Failed to load readiness diagnostics';
        setError(errorMessage);
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
    fetchData(false);
  }, [fetchData]);

  const fetchAIInsights = useCallback(async () => {
    if (!repoId || !data) {
      return;
    }

    try {
      const settings = await getOllamaSettings();
      if (!settings.enabled) {
        setOllamaEnabled(false);
        return;
      }
      setOllamaEnabled(true);
    } catch {
      setOllamaEnabled(false);
      return;
    }

    if (isFetchingAIInsightsRef.current) {
      return;
    }

    isFetchingAIInsightsRef.current = true;
    setAiInsightsLoading(true);
    setAiInsightsError(null);

    try {
      const result = await getReadinessDiagnostics(repoId, false, true);
      setData(result);
    } catch (err: unknown) {
      const errorMessage =
        (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data
          ?.error ||
        (err as { message?: string })?.message ||
        'Failed to generate AI insights';
      setAiInsightsError(errorMessage);
    } finally {
      setAiInsightsLoading(false);
      isFetchingAIInsightsRef.current = false;
    }
  }, [repoId, data]);

  useEffect(() => {
    const checkOllama = async () => {
      if (!data) return;
      try {
        const settings = await getOllamaSettings();
        setOllamaEnabled(settings.enabled);
      } catch {
        setOllamaEnabled(false);
      }
    };
    checkOllama();
  }, [data]);

  const chartData =
    data?.commitsByMonth.map((m) => ({
      month: m.month,
      commits: m.count,
    })) ?? [];

  return (
    <>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Readiness diagnostics
          </h1>
          {repoName && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5">{repoName}</p>
          )}
          <p className="text-gray-500 dark:text-gray-400 mt-1 max-w-3xl">
            Git-history signals useful before deep code reading: churn hotspots, contributor mix,
            bug-style touches, monthly commit rhythm, and firefighting-style commits.
          </p>
        </div>
        {repoId && <RecalculateButton loading={loading} onClick={() => fetchData(true)} />}
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      ) : data ? (
        <div className="space-y-10">
          <AIInsightsPanel
            insights={data.aiInsights}
            loading={aiInsightsLoading}
            error={aiInsightsError}
            onRefresh={fetchAIInsights}
            onGenerate={fetchAIInsights}
            title="AI Insights - Readiness Diagnostics"
            ollamaEnabled={ollamaEnabled}
          />
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/40">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Commits by month (all history)
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 mb-4">
              Non-merge commits grouped by commit month.
            </p>
            {chartData.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No commit data.</p>
            ) : (
              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 32 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-gray-200 dark:stroke-gray-700"
                    />
                    <XAxis
                      dataKey="month"
                      angle={-35}
                      textAnchor="end"
                      height={60}
                      tick={{ fontSize: 11, fill: 'currentColor' }}
                      className="text-gray-600 dark:text-gray-400"
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'currentColor' }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid rgb(229 231 235)',
                      }}
                    />
                    <Bar dataKey="commits" fill="#6366f1" radius={[4, 4, 0, 0]} name="Commits" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
          <ReadinessDiagnosticsDisplay data={data} />
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          Select a repository to view readiness diagnostics.
        </div>
      )}
    </>
  );
}
