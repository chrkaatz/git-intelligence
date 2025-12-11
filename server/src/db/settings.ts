import { getDb } from './database.js';
import type { OllamaSettings } from './types.js';
import { defaultData } from './database.js';

/**
 * Get current Ollama settings
 * @returns Promise resolving to Ollama settings
 */
export async function getOllamaSettings(): Promise<OllamaSettings> {
  const database = await getDb();

  // Return settings if they exist, otherwise return defaults
  if (database.data.ollamaSettings) {
    return database.data.ollamaSettings;
  }

  // If settings don't exist, initialize with defaults and save
  const defaultSettings = defaultData.ollamaSettings!;
  database.data.ollamaSettings = defaultSettings;
  await database.write();

  return defaultSettings;
}

/**
 * Update Ollama settings
 * @param settings - Partial Ollama settings to update
 * @returns Promise resolving to updated Ollama settings
 */
export async function updateOllamaSettings(
  settings: Partial<OllamaSettings>
): Promise<OllamaSettings> {
  const database = await getDb();

  // Get current settings or use defaults
  const currentSettings = database.data.ollamaSettings || defaultData.ollamaSettings!;

  // Validate settings
  const updatedSettings: OllamaSettings = {
    enabled: settings.enabled !== undefined ? settings.enabled : currentSettings.enabled,
    host: settings.host !== undefined ? settings.host : currentSettings.host || 'localhost',
    port: settings.port !== undefined ? settings.port : currentSettings.port || 11434,
    model: settings.model !== undefined ? settings.model : currentSettings.model || 'llama3',
    timeout: settings.timeout !== undefined ? settings.timeout : currentSettings.timeout || 30000,
  };

  // Validate port range
  if (updatedSettings.port < 1 || updatedSettings.port > 65535) {
    throw new Error('Port must be between 1 and 65535');
  }

  // Validate timeout
  if (
    updatedSettings.timeout !== undefined &&
    (updatedSettings.timeout < 1000 || updatedSettings.timeout > 300000)
  ) {
    throw new Error('Timeout must be between 1000ms and 300000ms (5 minutes)');
  }

  // Validate host (basic validation)
  if (!updatedSettings.host || updatedSettings.host.trim().length === 0) {
    throw new Error('Host cannot be empty');
  }

  // Validate model name (basic validation)
  if (!updatedSettings.model || updatedSettings.model.trim().length === 0) {
    throw new Error('Model name cannot be empty');
  }

  // Update settings
  database.data.ollamaSettings = updatedSettings;
  await database.write();

  return updatedSettings;
}
