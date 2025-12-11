import { useState, useEffect } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { clearCache } from '../api';
import { useNotifications } from '../context/NotificationContext';
import { ConfirmationDialog } from './common/ConfirmationDialog';
import { useOllamaSettings } from '../hooks/useOllamaSettings';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  currentRepoId?: string;
}

export function SettingsDialog({ open, onClose, currentRepoId }: SettingsDialogProps) {
  const [clearingCache, setClearingCache] = useState(false);
  const { showNotification } = useNotifications();
  const [clearCacheDialog, setClearCacheDialog] = useState<{
    open: boolean;
    repoId?: string;
  }>({ open: false });

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
    model: 'llama3',
    timeout: 120000 as number | undefined, // Default 2 minutes
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

  // Reset connection status when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setConnectionStatus({ status: 'idle' });
      setValidationErrors({});
    }
  }, [open]);

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
        return; // Don't save if validation fails
      }
    } else if (field === 'host') {
      const hostValue = typeof value === 'string' ? value : String(value);
      if (!hostValue || hostValue.trim().length === 0) {
        setValidationErrors((prev) => ({
          ...prev,
          host: 'Host cannot be empty',
        }));
        return; // Don't save if validation fails
      }
    } else if (field === 'model') {
      const modelValue = typeof value === 'string' ? value : String(value);
      if (!modelValue || modelValue.trim().length === 0) {
        setValidationErrors((prev) => ({
          ...prev,
          model: 'Model name cannot be empty',
        }));
        return; // Don't save if validation fails
      }
    } else if (field === 'timeout') {
      const timeoutValue =
        typeof value === 'number' ? value : value ? parseInt(String(value), 10) : 120000;
      if (isNaN(timeoutValue) || timeoutValue < 1000 || timeoutValue > 300000) {
        setValidationErrors((prev) => ({
          ...prev,
          timeout: 'Timeout must be between 1000ms (1 second) and 300000ms (5 minutes)',
        }));
        return; // Don't save if validation fails
      } else {
        // Clear timeout error if value is valid
        setValidationErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.timeout;
          return newErrors;
        });
      }
    }

    // Auto-save when enabled toggle is changed (immediate feedback)
    if (field === 'enabled') {
      try {
        // When disabling, we can save immediately without validation of other fields
        // When enabling, we still need valid other fields, but we'll try to save
        await updateOllamaSettings({ enabled: value as boolean });
        // Reload settings to ensure sync
        await reloadOllamaSettings();
        showNotification('success', 'Ollama settings updated', 2000);
      } catch (error: unknown) {
        // Revert the toggle if save failed
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
    // Validate all fields
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
    // Validate before testing
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
    'llama3',
    'mistral',
    'codellama',
    'ministral-3:8b',
    'deepseek-r1',
    'mistral-small3.2',
    'qwen3',
  ];

  return (
    <>
      <Dialog open={open} onClose={onClose} className="relative z-50">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"
        />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel
            transition
            className="w-full max-w-md transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl transition duration-300 ease-in-out data-closed:scale-95 data-closed:opacity-0"
          >
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Settings
              </DialogTitle>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-6">
              {/* Cache Management Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Cache Management
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Clear cached analytics data to force recalculation. The cache automatically
                  invalidates when repositories have new commits.
                </p>

                <div className="space-y-3">
                  {currentRepoId && (
                    <button
                      onClick={() => handleClearCacheClick(currentRepoId)}
                      disabled={clearingCache}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <TrashIcon className="h-5 w-5" />
                      {clearingCache ? 'Clearing...' : 'Clear Repository Cache'}
                    </button>
                  )}

                  <button
                    onClick={() => handleClearCacheClick()}
                    disabled={clearingCache}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <TrashIcon className="h-5 w-5" />
                    {clearingCache ? 'Clearing...' : 'Clear All Cache'}
                  </button>
                </div>
              </div>

              {/* Cache Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  <strong>Note:</strong> The cache uses commit-hash-based invalidation. Analytics
                  are automatically recalculated when repositories have new commits, so manual cache
                  clearing is typically not necessary.
                </p>
              </div>

              {/* AI Analysis (Ollama) Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  AI Analysis (Ollama)
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Configure your local Ollama instance to enable AI-powered analysis insights for
                  your repositories.
                </p>

                {ollamaLoading ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Loading settings...
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Enable Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Enable Ollama
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Enable AI-powered analysis using your local Ollama instance
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={localOllamaSettings.enabled}
                          onChange={(e) => {
                            const newValue = e.target.checked;
                            // Save immediately (handleOllamaSettingChange will update state)
                            handleOllamaSettingChange('enabled', newValue);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {localOllamaSettings.enabled && (
                      <>
                        {/* Host Input */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Host
                          </label>
                          <input
                            type="text"
                            value={localOllamaSettings.host}
                            onChange={(e) => handleOllamaSettingChange('host', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg text-sm ${
                              validationErrors.host
                                ? 'border-red-300 dark:border-red-700'
                                : 'border-gray-300 dark:border-gray-600'
                            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                            placeholder="localhost"
                          />
                          {validationErrors.host && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {validationErrors.host}
                            </p>
                          )}
                        </div>

                        {/* Port Input */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Port
                          </label>
                          <input
                            type="number"
                            value={localOllamaSettings.port}
                            onChange={(e) =>
                              handleOllamaSettingChange('port', parseInt(e.target.value, 10))
                            }
                            min="1"
                            max="65535"
                            className={`w-full px-3 py-2 border rounded-lg text-sm ${
                              validationErrors.port
                                ? 'border-red-300 dark:border-red-700'
                                : 'border-gray-300 dark:border-gray-600'
                            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                            placeholder="11434"
                          />
                          {validationErrors.port && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {validationErrors.port}
                            </p>
                          )}
                        </div>

                        {/* Model Input with Suggestions */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Model
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={localOllamaSettings.model}
                              onChange={(e) => handleOllamaSettingChange('model', e.target.value)}
                              list="model-suggestions"
                              className={`w-full px-3 py-2 border rounded-lg text-sm ${
                                validationErrors.model
                                  ? 'border-red-300 dark:border-red-700'
                                  : 'border-gray-300 dark:border-gray-600'
                              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                              placeholder="llama3"
                            />
                            <datalist id="model-suggestions">
                              {modelSuggestions.map((model) => (
                                <option key={model} value={model} />
                              ))}
                            </datalist>
                          </div>
                          {validationErrors.model && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {validationErrors.model}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Suggested models: {modelSuggestions.join(', ')}
                          </p>
                        </div>

                        {/* Timeout Input */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Timeout (milliseconds)
                          </label>
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
                            className={`w-full px-3 py-2 border rounded-lg text-sm ${
                              validationErrors.timeout
                                ? 'border-red-300 dark:border-red-700'
                                : 'border-gray-300 dark:border-gray-600'
                            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                            placeholder="120000"
                          />
                          {validationErrors.timeout && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {validationErrors.timeout}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Request timeout in milliseconds. Recommended: 120000 (2 minutes) to
                            180000 (3 minutes) for complex analyses. Maximum: 300000 (5 minutes).
                          </p>
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
                        <div className="flex gap-3">
                          <button
                            onClick={handleTestConnection}
                            disabled={testingConnection || ollamaLoading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {testingConnection ? (
                              <>
                                <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                Testing...
                              </>
                            ) : (
                              'Test Connection'
                            )}
                          </button>
                          <button
                            onClick={handleSaveOllamaSettings}
                            disabled={
                              testingConnection ||
                              ollamaLoading ||
                              Object.keys(validationErrors).length > 0
                            }
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Save Settings
                          </button>
                        </div>

                        {ollamaError && (
                          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                            <p className="text-xs text-red-800 dark:text-red-300">{ollamaError}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

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
    </>
  );
}
