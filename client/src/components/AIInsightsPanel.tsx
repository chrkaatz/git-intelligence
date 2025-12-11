import { Disclosure } from '@headlessui/react';
import { ChevronDown, Sparkles, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState, useEffect, useRef } from 'react';

interface AIInsightsPanelProps {
  insights?: string;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onGenerate?: () => void;
  title?: string;
  ollamaEnabled?: boolean;
}

export function AIInsightsPanel({
  insights,
  loading = false,
  error = null,
  onRefresh,
  onGenerate,
  title = 'AI Insights',
  ollamaEnabled = false,
}: AIInsightsPanelProps) {
  // Track if insights/errors were previously available to detect when they become available
  // Hooks must be called unconditionally at the top level
  const prevInsightsRef = useRef<string | undefined>(insights);
  const prevErrorRef = useRef<string | null>(error);
  const [autoOpenKey, setAutoOpenKey] = useState<number | null>(null);

  // Update refs and auto-open key in effect
  useEffect(() => {
    // Check if insights/error just became available (for auto-opening)
    const insightsJustAppeared = insights && !prevInsightsRef.current && !loading;
    const errorJustAppeared = error && !prevErrorRef.current && !loading;

    // Set key when insights/error first appear (only once per appearance)
    // This is intentional - we need to trigger a remount when insights appear
    if ((insightsJustAppeared || errorJustAppeared) && autoOpenKey === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAutoOpenKey(Date.now());
    }

    // Reset key when insights/error clear
    if (!insights && !error && autoOpenKey !== null) {
      setAutoOpenKey(null);
    }

    prevInsightsRef.current = insights;
    prevErrorRef.current = error;
  }, [insights, error, loading, autoOpenKey]);

  const shouldAutoOpen = autoOpenKey !== null;

  // Don't render if Ollama is disabled and there are no insights/errors
  if (!ollamaEnabled && !insights && !loading && !error) {
    return null;
  }

  // Show panel if Ollama is enabled (even without insights) or if there are insights/loading/error
  const shouldShow = ollamaEnabled || insights || loading || error;
  if (!shouldShow) {
    return null;
  }

  // Use a key that changes when insights/error appear to force remount with defaultOpen
  const disclosureKey = autoOpenKey ? `auto-open-${autoOpenKey}` : undefined;

  return (
    <div className="mb-6">
      <Disclosure key={disclosureKey} defaultOpen={shouldAutoOpen}>
        {({ open }) => (
          <>
            <Disclosure.Button
              className={clsx(
                'flex w-full items-center justify-between rounded-lg bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-left text-sm font-medium text-blue-900 dark:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors',
                open && 'bg-blue-100 dark:bg-blue-900/30'
              )}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span>{title}</span>
                {loading && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                )}
                {error && <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />}
              </div>
              <div className="flex items-center gap-2">
                {onRefresh && insights && !loading && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRefresh();
                    }}
                    className="rounded p-1 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                    title="Refresh AI insights"
                  >
                    <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </button>
                )}
                {onGenerate && !insights && !loading && !error && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onGenerate();
                    }}
                    className="rounded px-3 py-1.5 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    title="Generate AI insights"
                  >
                    Generate
                  </button>
                )}
                <ChevronDown
                  className={clsx(
                    'h-5 w-5 text-blue-600 dark:text-blue-400 transition-transform',
                    open && 'transform rotate-180'
                  )}
                />
              </div>
            </Disclosure.Button>
            <Disclosure.Panel className="mt-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
              {loading && (
                <div className="flex items-center gap-3 py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    Generating AI insights... This may take a moment.
                  </span>
                </div>
              )}
              {error && (
                <div className="flex items-start gap-3 py-4">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                      Unable to generate AI insights
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    {onRefresh && (
                      <button
                        onClick={onRefresh}
                        className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Try again
                      </button>
                    )}
                  </div>
                </div>
              )}
              {insights && !loading && !error && (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-code:text-blue-600 dark:prose-code:text-blue-400 prose-code:bg-blue-50 dark:prose-code:bg-blue-900/20 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-gray-100 dark:prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700 prose-ul:my-4 prose-ol:my-4 prose-li:my-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{insights}</ReactMarkdown>
                </div>
              )}
              {!insights && !loading && !error && (
                <div className="py-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    AI insights have not been generated yet.
                  </p>
                  {onGenerate && (
                    <button
                      onClick={onGenerate}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Generate AI Insights
                    </button>
                  )}
                </div>
              )}
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>
    </div>
  );
}
