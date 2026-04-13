import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from '@tanstack/react-router';
import { CrossRepoReadinessDiagnostics } from './CrossRepoReadinessDiagnostics';
import {
  getCrossRepoReadinessDiagnostics,
  getOllamaSettings,
  type CrossRepoReadinessDiagnostics as CrossRepoReadinessDiagnosticsType,
} from '../api';
import { Loader2, AlertCircle } from 'lucide-react';
import { RecalculateButton } from './common/RecalculateButton';
import { useNotifications } from '../context/NotificationContext';
import { useApp } from '../hooks/useApp';
import { AIInsightsPanel } from './AIInsightsPanel';

export function CrossRepoReadinessDiagnosticsView() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params?.projectId;
  const { projects } = useApp();
  const [data, setData] = useState<CrossRepoReadinessDiagnosticsType | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);
  const [aiInsightsError, setAiInsightsError] = useState<string | null>(null);
  const [ollamaEnabled, setOllamaEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showNotification, removeNotification } = useNotifications();
  const loadingNotificationIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);
  const isFetchingAIInsightsRef = useRef(false);

  const project = projectId ? projects.find((p) => p.id === projectId) : null;
  const projectName = project?.name || '';

  const fetchData = useCallback(
    async (refresh: boolean = false) => {
      if (!projectId) {
        setData(null);
        return;
      }
      if (isFetchingRef.current) return;

      isFetchingRef.current = true;
      setLoading(true);
      setError(null);

      const message = refresh
        ? 'Recalculating cross-repo readiness diagnostics...'
        : 'Loading cross-repo readiness diagnostics...';
      const loadingId = showNotification('loading', message, 0);
      loadingNotificationIdRef.current = loadingId;

      try {
        const result = await getCrossRepoReadinessDiagnostics(projectId, refresh);
        setData(result);
        if (loadingNotificationIdRef.current) {
          removeNotification(loadingNotificationIdRef.current);
          loadingNotificationIdRef.current = null;
        }
        showNotification(
          'success',
          refresh
            ? `Recalculated for ${result.totalRepos} repositories.`
            : `Loaded for ${result.totalRepos} repositories.`,
          3000
        );
      } catch (err: unknown) {
        const errorMessage =
          (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data
            ?.error ||
          (err as { message?: string })?.message ||
          'Failed to load cross-repo readiness diagnostics';
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
    [projectId, showNotification, removeNotification]
  );

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  const fetchAIInsights = useCallback(async () => {
    if (!projectId || !data) {
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
      const result = await getCrossRepoReadinessDiagnostics(projectId, false, true);
      setData(result);
    } catch (err: unknown) {
      const errorMessage =
        (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data
          ?.error ||
        (err as { message?: string })?.message ||
        'Failed to generate cross-repo AI insights';
      setAiInsightsError(errorMessage);
    } finally {
      setAiInsightsLoading(false);
      isFetchingAIInsightsRef.current = false;
    }
  }, [projectId, data]);

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

  return (
    <>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Cross-repo readiness diagnostics
          </h1>
          {projectId && projectName && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5">{projectName}</p>
          )}
          <p className="text-gray-500 dark:text-gray-400 mt-1 max-w-3xl">
            Per-repository diagnostics plus combined commit volume by month and merged contributor
            counts.
          </p>
        </div>
        {projectId && <RecalculateButton loading={loading} onClick={() => fetchData(true)} />}
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
        <div className="space-y-8">
          <AIInsightsPanel
            insights={data.aiInsights}
            loading={aiInsightsLoading}
            error={aiInsightsError}
            onRefresh={fetchAIInsights}
            onGenerate={fetchAIInsights}
            title="AI Insights - Cross-Repo Readiness Diagnostics"
            ollamaEnabled={ollamaEnabled}
          />
          <CrossRepoReadinessDiagnostics data={data} />
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          Select a project with repositories to view cross-repo readiness diagnostics.
        </div>
      )}
    </>
  );
}
