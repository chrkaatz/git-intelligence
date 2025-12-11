import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from '@tanstack/react-router';
import { RepositoryEvolution as RepositoryEvolutionComponent } from './RepositoryEvolution';
import {
  getRepositoryEvolution,
  getOllamaSettings,
  type RepositoryEvolution as RepositoryEvolutionType,
} from '../api';
import { Loader2, AlertCircle } from 'lucide-react';
import { RecalculateButton } from './common/RecalculateButton';
import { useNotifications } from '../context/NotificationContext';
import { useApp } from '../hooks/useApp';
import { AIInsightsPanel } from './AIInsightsPanel';

export function RepositoryEvolutionView() {
  const params = useParams({ strict: false }) as { repoId?: string };
  const repoId = params?.repoId;
  const { repositories } = useApp();
  const [evolution, setEvolution] = useState<RepositoryEvolutionType | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);
  const [aiInsightsError, setAiInsightsError] = useState<string | null>(null);
  const [ollamaEnabled, setOllamaEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showNotification, removeNotification } = useNotifications();
  const loadingNotificationIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);
  const isFetchingAIInsightsRef = useRef(false);

  // Get repository name from ID
  const repository = repoId ? repositories.find((r) => r.id === repoId) : null;
  const repoName = repository?.name || '';

  const fetchEvolution = useCallback(
    async (refresh: boolean = false) => {
      if (!repoId) {
        setEvolution(null);
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
        ? 'Recalculating repository evolution metrics... This may take a moment.'
        : 'Calculating repository evolution metrics... This may take a moment.';
      const loadingId = showNotification('loading', message, 0);
      loadingNotificationIdRef.current = loadingId;

      try {
        const data = await getRepositoryEvolution(repoId, refresh);
        setEvolution(data);
        // Remove loading notification and show success
        if (loadingNotificationIdRef.current) {
          removeNotification(loadingNotificationIdRef.current);
          loadingNotificationIdRef.current = null;
        }
        const successMessage = refresh
          ? 'Repository evolution metrics recalculated successfully!'
          : 'Repository evolution metrics calculated successfully!';
        showNotification('success', successMessage, 3000);
      } catch (err: unknown) {
        const errorMessage =
          (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data
            ?.error ||
          (err as { message?: string })?.message ||
          'Failed to load repository evolution metrics';
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

  const fetchAIInsights = useCallback(async () => {
    if (!repoId || !evolution) {
      return;
    }

    // Check if Ollama is enabled first
    try {
      const settings = await getOllamaSettings();
      if (!settings.enabled) {
        setOllamaEnabled(false);
        return;
      }
      setOllamaEnabled(true);
    } catch {
      // If we can't get settings, assume disabled
      setOllamaEnabled(false);
      return;
    }

    // Prevent duplicate fetches
    if (isFetchingAIInsightsRef.current) {
      return;
    }

    isFetchingAIInsightsRef.current = true;
    setAiInsightsLoading(true);
    setAiInsightsError(null);

    try {
      const data = await getRepositoryEvolution(repoId, false, true);
      setEvolution(data);
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
  }, [repoId, evolution]);

  useEffect(() => {
    fetchEvolution(false);
  }, [fetchEvolution]);

  // Check Ollama settings when evolution data is loaded (but don't auto-fetch insights)
  useEffect(() => {
    const checkOllama = async () => {
      if (!evolution) {
        return;
      }

      // Check if Ollama is enabled
      try {
        const settings = await getOllamaSettings();
        setOllamaEnabled(settings.enabled);
      } catch {
        setOllamaEnabled(false);
      }
    };

    checkOllama();
  }, [evolution]);

  return (
    <>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Repository Evolution</h1>
          {repoId && evolution && repoName && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5">{repoName}</p>
          )}
        </div>
        {repoId && <RecalculateButton loading={loading} onClick={() => fetchEvolution(true)} />}
      </div>

      {loading && !evolution ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      ) : evolution ? (
        <>
          <AIInsightsPanel
            insights={evolution.aiInsights}
            loading={aiInsightsLoading}
            error={aiInsightsError}
            onRefresh={fetchAIInsights}
            onGenerate={fetchAIInsights}
            title="AI Insights - Repository Evolution"
            ollamaEnabled={ollamaEnabled}
          />
          <RepositoryEvolutionComponent evolution={evolution} loading={loading} />
        </>
      ) : (
        <div className="text-center py-12 text-gray-500">
          No repository selected. Select a repository from the list to view repository evolution
          analytics.
        </div>
      )}
    </>
  );
}
