import { useState, useEffect } from 'react';
import { TrashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { clearCache } from '../api';
import { useNotifications } from '../context/NotificationContext';
import { ConfirmationDialog } from './common/ConfirmationDialog';
import { useOllamaSettings } from '../hooks/useOllamaSettings';
import { useParams } from '@tanstack/react-router';

export function SettingsPage() {
  const [clearingCache, setClearingCache] = useState(false);
  const { showNotification } = useNotifications();
  const [clearCacheDialog, setClearCacheDialog] = useState<{
    open: boolean;
    repoId?: string;
  }>({ open: false });

  // Try to get repoId from params if we are in a context where it exists,
  // though typically /settings won't have it unless we nest it or use query params.
  // For now we'll assume global settings, but if we want to support repo-specific
  // actions we might need to look at how to get that context.
  // The original dialog received it as a prop.
  const params = useParams({ strict: false }) as { repoId?: string };
  const currentRepoId = params?.repoId;

  // Ollama settings
  const {
    settings: ollamaSettings,
    loading: ollamaLoading,
    error: ollamaError,
    updateSettings: updateOllamaSettings,
    testConnection,
    reloadSettings: reloadOllamaSettings,
  } = useOllamaSettings();

  const [localOllamaSettings, setLocalOllamaSettings] = useState({
    enabled: false,
    host: 'localhost',
    port: 11434,
    model: 'gemma4:e2b',
    timeout: 120000 as number | undefined,
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    status: 'idle' | 'success' | 'error';
    message?: string;
  }>({ status: 'idle' });
  const [validationErrors, setValidationErrors] = useState<{
    host?: string;
    port?: string;
    model?: string;
    timeout?: string;
  }>({});

  // Sync local state with hook settings when they load or change
  useEffect(() => {
    if (!ollamaLoading && ollamaSettings) {
      setLocalOllamaSettings({
        enabled: ollamaSettings.enabled,
        host: ollamaSettings.host,
        port: ollamaSettings.port,
        model: ollamaSettings.model,
        timeout: ollamaSettings.timeout,
      });
    }
  }, [ollamaSettings, ollamaLoading]);

  const handleClearCacheClick = (repoId?: string) => {
    setClearCacheDialog({ open: true, repoId });
  };

  const handleConfirmClearCache = async () => {
    const { repoId } = clearCacheDialog;
    setClearingCache(true);
    setClearCacheDialog({ open: false });
    try {
      await clearCache(repoId);
      showNotification(
        'success',
        repoId ? 'Repository cache cleared successfully!' : 'All cache cleared successfully!',
        3000
      );
    } catch (error: unknown) {
      const errorMessage =
        (error as { response?: { data?: { error?: string } }; message?: string })?.response?.data
          ?.error ||
        (error as { message?: string })?.message ||
        'Failed to clear cache';
      showNotification('error', errorMessage, 5000);
    } finally {
      setClearingCache(false);
    }
  };

  // Ollama settings handlers
  const handleOllamaSettingChange = async (
    field: keyof typeof localOllamaSettings,
    value: string | number | boolean
  ) => {
    const updatedSettings = { ...localOllamaSettings, [field]: value };
    setLocalOllamaSettings(updatedSettings);
    // Clear validation error for this field
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field as keyof typeof newErrors];
      return newErrors;
    });

    // Validate on change
    if (field === 'port') {
      const portNum = typeof value === 'number' ? value : parseInt(String(value), 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        setValidationErrors((prev) => ({
          ...prev,
          port: 'Port must be between 1 and 65535',
        }));
        return;
      }
    } else if (field === 'host') {
      const hostValue = typeof value === 'string' ? value : String(value);
      if (!hostValue || hostValue.trim().length === 0) {
        setValidationErrors((prev) => ({
          ...prev,
          host: 'Host cannot be empty',
        }));
        return;
      }
    } else if (field === 'model') {
      const modelValue = typeof value === 'string' ? value : String(value);
      if (!modelValue || modelValue.trim().length === 0) {
        setValidationErrors((prev) => ({
          ...prev,
          model: 'Model name cannot be empty',
        }));
        return;
      }
    } else if (field === 'timeout') {
      const timeoutValue =
        typeof value === 'number' ? value : value ? parseInt(String(value), 10) : 120000;
      if (isNaN(timeoutValue) || timeoutValue < 1000 || timeoutValue > 300000) {
        setValidationErrors((prev) => ({
          ...prev,
          timeout: 'Timeout must be between 1000ms (1 second) and 300000ms (5 minutes)',
        }));
        return;
      } else {
        setValidationErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.timeout;
          return newErrors;
        });
      }
    }

    // Auto-save when enabled toggle is changed
    if (field === 'enabled') {
      try {
        await updateOllamaSettings({ enabled: value as boolean });
        await reloadOllamaSettings();
        showNotification('success', 'Ollama settings updated', 2000);
      } catch (error: unknown) {
        setLocalOllamaSettings((prev) => ({ ...prev, enabled: !(value as boolean) }));
        const errorMessage =
          (error as { response?: { data?: { error?: string } }; message?: string })?.response?.data
            ?.error ||
          (error as { message?: string })?.message ||
          'Failed to update settings';
        showNotification('error', errorMessage, 5000);
      }
    }
  };

  const handleSaveOllamaSettings = async () => {
    const errors: typeof validationErrors = {};
    if (!localOllamaSettings.host || localOllamaSettings.host.trim().length === 0) {
      errors.host = 'Host cannot be empty';
    }
    const portNum = parseInt(String(localOllamaSettings.port), 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      errors.port = 'Port must be between 1 and 65535';
    }
    if (!localOllamaSettings.model || localOllamaSettings.model.trim().length === 0) {
      errors.model = 'Model name cannot be empty';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      await updateOllamaSettings(localOllamaSettings);
      showNotification('success', 'Ollama settings saved successfully!', 3000);
      setConnectionStatus({ status: 'idle' });
    } catch (error: unknown) {
      const errorMessage =
        (error as { response?: { data?: { error?: string } }; message?: string })?.response?.data
          ?.error ||
        (error as { message?: string })?.message ||
        'Failed to save settings';
      showNotification('error', errorMessage, 5000);
    }
  };

  const handleTestConnection = async () => {
    const errors: typeof validationErrors = {};
    if (!localOllamaSettings.host || localOllamaSettings.host.trim().length === 0) {
      errors.host = 'Host cannot be empty';
    }
    const portNum = parseInt(String(localOllamaSettings.port), 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      errors.port = 'Port must be between 1 and 65535';
    }
    if (!localOllamaSettings.model || localOllamaSettings.model.trim().length === 0) {
      errors.model = 'Model name cannot be empty';
    }
    const timeoutNum = localOllamaSettings.timeout || 120000;
    if (isNaN(timeoutNum) || timeoutNum < 1000 || timeoutNum > 300000) {
      errors.timeout = 'Timeout must be between 1000ms (1 second) and 300000ms (5 minutes)';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setTestingConnection(true);
    setConnectionStatus({ status: 'idle' });
    try {
      const result = await testConnection({
        host: localOllamaSettings.host,
        port: localOllamaSettings.port,
        model: localOllamaSettings.model,
      });
      if (result.success) {
        setConnectionStatus({ status: 'success', message: result.message });
        showNotification('success', result.message || 'Connection test successful!', 3000);
      } else {
        setConnectionStatus({ status: 'error', message: result.message });
        showNotification('error', result.message || 'Connection test failed', 5000);
      }
    } catch (error: unknown) {
      const errorMessage = (error as { message?: string })?.message || 'Failed to test connection';
      setConnectionStatus({ status: 'error', message: errorMessage });
      showNotification('error', errorMessage, 5000);
    } finally {
      setTestingConnection(false);
    }
  };

  const modelSuggestions = [
    'gemma4:e2b',
    'llama3.2',
    'mistral',
    'codellama',
    'ministral-3:8b',
    'deepseek-r1',
    'mistral-small3.2',
    'qwen3',
  ];

  return (
    <div>
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
      </div>

      {/* Cache Management Section */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cache Management</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Clear cached analytics data to force recalculation. The cache automatically invalidates
          when repositories have new commits.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          {currentRepoId && (
            <button
              onClick={() => handleClearCacheClick(currentRepoId)}
              disabled={clearingCache}
              className="inline-flex items-center gap-2 px-4 py-2 border border-transparent font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TrashIcon className="h-4 w-4" />
              {clearingCache ? 'Clearing...' : 'Clear Repository Cache'}
            </button>
          )}

          <button
            onClick={() => handleClearCacheClick()}
            disabled={clearingCache}
            className="inline-flex items-center gap-2 px-4 py-2 border border-transparent font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TrashIcon className="h-4 w-4" />
            {clearingCache ? 'Clearing...' : 'Clear All Cache'}
          </button>
        </div>

        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
          The cache uses commit-hash-based invalidation. Analytics are automatically recalculated
          when repositories have new commits, so manual clearing is typically not necessary.
        </p>
      </section>

      <div className="border-t border-gray-200 dark:border-gray-700" />

      {/* AI Analysis (Ollama) Section */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          AI Analysis (Ollama)
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure your local Ollama instance to enable AI-powered analysis insights for your
          repositories.
        </p>

        {ollamaLoading ? (
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading settings...</div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable Ollama
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Enable AI-powered analysis using your local Ollama instance
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localOllamaSettings.enabled}
                  onChange={(e) => {
                    const newValue = e.target.checked;
                    handleOllamaSettingChange('enabled', newValue);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {localOllamaSettings.enabled && (
              <div className="space-y-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  {/* Host Input */}
                  <div className="sm:col-span-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Host
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        value={localOllamaSettings.host}
                        onChange={(e) => handleOllamaSettingChange('host', e.target.value)}
                        className={`block w-full rounded-md shadow-sm sm:text-sm ${
                          validationErrors.host
                            ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500'
                        }`}
                        placeholder="localhost"
                      />
                    </div>
                    {validationErrors.host && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {validationErrors.host}
                      </p>
                    )}
                  </div>

                  {/* Port Input */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Port
                    </label>
                    <div className="mt-1">
                      <input
                        type="number"
                        value={localOllamaSettings.port}
                        onChange={(e) =>
                          handleOllamaSettingChange('port', parseInt(e.target.value, 10))
                        }
                        min="1"
                        max="65535"
                        className={`block w-full rounded-md shadow-sm sm:text-sm ${
                          validationErrors.port
                            ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500'
                        }`}
                        placeholder="11434"
                      />
                    </div>
                    {validationErrors.port && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {validationErrors.port}
                      </p>
                    )}
                  </div>

                  {/* Model Input with Suggestions */}
                  <div className="sm:col-span-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Model
                    </label>
                    <div className="mt-1 relative">
                      <input
                        type="text"
                        value={localOllamaSettings.model}
                        onChange={(e) => handleOllamaSettingChange('model', e.target.value)}
                        list="model-suggestions"
                        className={`block w-full rounded-md shadow-sm sm:text-sm ${
                          validationErrors.model
                            ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500'
                        }`}
                        placeholder="llama3"
                      />
                      <datalist id="model-suggestions">
                        {modelSuggestions.map((model) => (
                          <option key={model} value={model} />
                        ))}
                      </datalist>
                    </div>
                    {validationErrors.model && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {validationErrors.model}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      Suggested: {modelSuggestions.join(', ')}
                    </p>
                  </div>

                  {/* Timeout Input */}
                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Timeout (milliseconds)
                    </label>
                    <div className="mt-1">
                      <input
                        type="number"
                        value={localOllamaSettings.timeout || 120000}
                        onChange={(e) =>
                          handleOllamaSettingChange(
                            'timeout',
                            e.target.value ? parseInt(e.target.value, 10) : 120000
                          )
                        }
                        min="1000"
                        max="300000"
                        step="1000"
                        className={`block w-full rounded-md shadow-sm sm:text-sm ${
                          validationErrors.timeout
                            ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500'
                        }`}
                        placeholder="120000"
                      />
                    </div>
                    {validationErrors.timeout && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {validationErrors.timeout}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      Recommended: 120000–180000. Maximum: 300000 (5 min).
                    </p>
                  </div>
                </div>

                {/* Connection Status */}
                {connectionStatus.status !== 'idle' && (
                  <div
                    className={`flex items-center gap-2 p-3 rounded-lg ${
                      connectionStatus.status === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    }`}
                  >
                    {connectionStatus.status === 'success' ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    )}
                    <p
                      className={`text-sm ${
                        connectionStatus.status === 'success'
                          ? 'text-green-800 dark:text-green-300'
                          : 'text-red-800 dark:text-red-300'
                      }`}
                    >
                      {connectionStatus.message}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={handleTestConnection}
                    disabled={testingConnection || ollamaLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testingConnection ? (
                      <>
                        <div className="h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        Testing...
                      </>
                    ) : (
                      'Test Connection'
                    )}
                  </button>
                  <button
                    onClick={handleSaveOllamaSettings}
                    disabled={
                      testingConnection || ollamaLoading || Object.keys(validationErrors).length > 0
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 border border-transparent font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Settings
                  </button>
                </div>

                {ollamaError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <p className="text-sm text-red-800 dark:text-red-300">{ollamaError}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <ConfirmationDialog
        open={clearCacheDialog.open}
        onClose={() => setClearCacheDialog({ open: false })}
        onConfirm={handleConfirmClearCache}
        title="Clear Cache"
        message={`Are you sure you want to clear the ${clearCacheDialog.repoId ? 'repository' : 'all'} cache? This will force recalculation of all analytics on next load.`}
        confirmLabel="Clear Cache"
        cancelLabel="Cancel"
        variant="warning"
      />
    </div>
  );
}
