import { useState, useEffect, useCallback } from 'react';
import {
  getOllamaSettings,
  updateOllamaSettings,
  testOllamaConnection,
  type OllamaSettings,
  type OllamaTestResult,
} from '../api';

const OLLAMA_SETTINGS_KEY = 'ollamaSettings';
const DEFAULT_SETTINGS: OllamaSettings = {
  enabled: false,
  host: 'localhost',
  port: 11434,
  model: 'llama3',
  timeout: 30000,
};

/**
 * Hook to manage Ollama settings with localStorage caching and backend sync
 */
export function useOllamaSettings() {
  const [settings, setSettings] = useState<OllamaSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);

  /**
   * Load settings from localStorage (immediate) and sync with backend
   */
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // First, try to load from localStorage for immediate display
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(OLLAMA_SETTINGS_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setSettings(parsed);
          } catch {
            // Invalid cache, ignore
          }
        }
      }

      // Then sync with backend
      try {
        const backendSettings = await getOllamaSettings();
        setSettings(backendSettings);
        setSynced(true);

        // Update localStorage cache
        if (typeof window !== 'undefined') {
          localStorage.setItem(OLLAMA_SETTINGS_KEY, JSON.stringify(backendSettings));
        }
      } catch (err) {
        // If backend sync fails, use cached settings if available
        console.warn('Failed to sync Ollama settings from backend:', err);
        // Check if we have cached settings, otherwise set error
        const cached =
          typeof window !== 'undefined' ? localStorage.getItem(OLLAMA_SETTINGS_KEY) : null;
        if (!cached) {
          setError('Failed to load settings from server');
        }
        setSynced(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update settings (both backend and localStorage)
   */
  const updateSettings = useCallback(
    async (updates: Partial<OllamaSettings>): Promise<void> => {
      try {
        setError(null);

        // Optimistically update local state using functional update
        setSettings((prevSettings) => {
          const newSettings = { ...prevSettings, ...updates };

          // Update localStorage immediately
          if (typeof window !== 'undefined') {
            localStorage.setItem(OLLAMA_SETTINGS_KEY, JSON.stringify(newSettings));
          }

          return newSettings;
        });

        // Sync with backend
        const backendSettings = await updateOllamaSettings(updates);
        setSettings(backendSettings);
        setSynced(true);

        // Update localStorage with server response
        if (typeof window !== 'undefined') {
          localStorage.setItem(OLLAMA_SETTINGS_KEY, JSON.stringify(backendSettings));
        }
      } catch (err) {
        // Revert to previous settings on error
        await loadSettings();
        const errorMessage = err instanceof Error ? err.message : 'Failed to update settings';
        setError(errorMessage);
        throw err;
      }
    },
    [loadSettings]
  );

  /**
   * Reset settings to defaults
   */
  const resetSettings = useCallback(async (): Promise<void> => {
    await updateSettings(DEFAULT_SETTINGS);
  }, [updateSettings]);

  /**
   * Test Ollama connection
   */
  const testConnection = useCallback(
    async (testSettings?: Partial<OllamaSettings>): Promise<OllamaTestResult> => {
      try {
        setError(null);
        const result = await testOllamaConnection(testSettings || settings);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to test connection';
        setError(errorMessage);
        return {
          success: false,
          message: errorMessage,
        };
      }
    },
    [settings]
  );

  /**
   * Get current settings (from state)
   */
  const getSettings = useCallback((): OllamaSettings => {
    return settings;
  }, [settings]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    error,
    synced,
    updateSettings,
    resetSettings,
    testConnection,
    getSettings,
    reloadSettings: loadSettings,
  };
}
