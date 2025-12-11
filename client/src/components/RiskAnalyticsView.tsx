import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from '@tanstack/react-router';
import { RiskAnalytics as RiskAnalyticsComponent } from './RiskAnalytics';
import {
  getRiskAnalytics,
  getOllamaSettings,
  type RiskAnalytics as RiskAnalyticsType,
} from '../api';
import { Loader2, AlertCircle } from 'lucide-react';
import { RecalculateButton } from './common/RecalculateButton';
import { useNotifications } from '../context/NotificationContext';
import { useApp } from '../hooks/useApp';
import { AIInsightsPanel } from './AIInsightsPanel';

export function RiskAnalyticsView() {
  const params = useParams({ strict: false }) as { repoId?: string };
  const repoId = params?.repoId;
  const { repositories } = useApp();
  const [riskAnalytics, setRiskAnalytics] = useState<RiskAnalyticsType | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);
  const [aiInsightsError, setAiInsightsError] = useState<string | null>(null);
  const [ollamaEnabled, setOllamaEnabled] = useState(false);
  const { showNotification, removeNotification } = useNotifications();
  const loadingNotificationIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);
  const isFetchingAIInsightsRef = useRef(false);

  // Get repository name from ID
  const repository = repoId ? repositories.find((r) => r.id === repoId) : null;
  const repoName = repository?.name || '';

  const fetchAnalytics = useCallback(
    async (refresh: boolean = false) => {
      if (!repoId) {
        setRiskAnalytics(null);
        return;
      }

      // Prevent duplicate fetches
      if (isFetchingRef.current) {
        return;
      }

      isFetchingRef.current = true;
      setAnalyticsLoading(true);
      setError(null);

      // Show loading notification
      const message = refresh
        ? 'Recalculating risk analytics... This may take a moment.'
        : 'Calculating risk analytics... This may take a moment.';
      const loadingId = showNotification('loading', message, 0);
      loadingNotificationIdRef.current = loadingId;

      try {
        const data = await getRiskAnalytics(repoId, refresh);
        setRiskAnalytics(data);
        // Remove loading notification and show success
        if (loadingNotificationIdRef.current) {
          removeNotification(loadingNotificationIdRef.current);
          loadingNotificationIdRef.current = null;
        }
        const successMessage = refresh
          ? 'Risk analytics recalculated successfully!'
          : 'Risk analytics calculated successfully!';
        showNotification('success', successMessage, 3000);
      } catch (err: unknown) {
        const errorMessage =
          (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data
            ?.error ||
          (err as { message?: string })?.message ||
          'Failed to load risk analytics';
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
    },
    [repoId, showNotification, removeNotification]
  );

  const fetchAIInsights = useCallback(async () => {
    if (!repoId || !riskAnalytics) {
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
      const data = await getRiskAnalytics(repoId, false, true);
      setRiskAnalytics(data);
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
  }, [repoId, riskAnalytics]);

  useEffect(() => {
    fetchAnalytics(false);
  }, [fetchAnalytics]);

  // Check Ollama settings when analytics are loaded (but don't auto-fetch insights)
  useEffect(() => {
    const checkOllama = async () => {
      if (!riskAnalytics) {
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
  }, [riskAnalytics]);

  return (
    <>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Risk Analytics</h1>
          {repoId && riskAnalytics && repoName && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5">{repoName}</p>
          )}
        </div>
        {repoId && (
          <RecalculateButton loading={analyticsLoading} onClick={() => fetchAnalytics(true)} />
        )}
      </div>

      {analyticsLoading && !riskAnalytics ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      ) : riskAnalytics ? (
        <>
          <AIInsightsPanel
            insights={riskAnalytics.aiInsights}
            loading={aiInsightsLoading}
            error={aiInsightsError}
            onRefresh={fetchAIInsights}
            onGenerate={fetchAIInsights}
            title="AI Insights - Risk Analytics"
            ollamaEnabled={ollamaEnabled}
          />
          <RiskAnalyticsComponent
            highRiskHotspots={riskAnalytics.highRiskHotspots}
            temporalCouplingHotspots={riskAnalytics.temporalCouplingHotspots}
            riskyFileTrends={riskAnalytics.riskyFileTrends}
          />
        </>
      ) : (
        <div className="text-center py-12 text-gray-500">
          No repository selected. Select a repository from the list to view risk analytics.
        </div>
      )}
    </>
  );
}
