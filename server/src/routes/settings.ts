import { Router, Request, Response } from 'express';
import { getOllamaSettings, updateOllamaSettings } from '../db/settings.js';
import { testConnection, isModelAvailable } from '../services/ollama.js';
import type { OllamaSettings } from '../db/types.js';

const router = Router();

/**
 * GET /settings/ollama
 * Get current Ollama settings
 */
router.get('/ollama', async (req: Request, res: Response) => {
  try {
    const settings = await getOllamaSettings();
    res.json(settings);
  } catch (error) {
    console.error('Failed to get Ollama settings:', error);
    res.status(500).json({ error: 'Failed to fetch Ollama settings' });
  }
});

/**
 * PUT /settings/ollama
 * Update Ollama settings
 * Body: { enabled?: boolean, host?: string, port?: number, model?: string, timeout?: number }
 */
router.put('/ollama', async (req: Request, res: Response) => {
  try {
    const updates = req.body;

    // Validate request body
    if (updates.enabled !== undefined && typeof updates.enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    if (updates.host !== undefined && typeof updates.host !== 'string') {
      return res.status(400).json({ error: 'host must be a string' });
    }

    if (
      updates.port !== undefined &&
      (typeof updates.port !== 'number' || !Number.isInteger(updates.port))
    ) {
      return res.status(400).json({ error: 'port must be an integer' });
    }

    if (updates.model !== undefined && typeof updates.model !== 'string') {
      return res.status(400).json({ error: 'model must be a string' });
    }

    if (
      updates.timeout !== undefined &&
      (typeof updates.timeout !== 'number' || !Number.isInteger(updates.timeout))
    ) {
      return res.status(400).json({ error: 'timeout must be an integer' });
    }

    const updatedSettings = await updateOllamaSettings(updates);
    res.json(updatedSettings);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('must be between')) {
        return res.status(400).json({ error: error.message });
      }
      if (error.message.includes('cannot be empty')) {
        return res.status(400).json({ error: error.message });
      }
    }
    console.error('Failed to update Ollama settings:', error);
    res.status(500).json({ error: 'Failed to update Ollama settings' });
  }
});

/**
 * POST /settings/ollama/test
 * Test Ollama connection
 * Body (optional): { host?: string, port?: number, model?: string }
 * If body is not provided, uses current settings
 */
router.post('/ollama/test', async (req: Request, res: Response) => {
  try {
    let settings: OllamaSettings;

    // If settings provided in body, use them; otherwise use current settings
    if (req.body && (req.body.host || req.body.port || req.body.model)) {
      const currentSettings = await getOllamaSettings();
      settings = {
        enabled: true, // Enable for testing
        host: req.body.host || currentSettings.host,
        port: req.body.port !== undefined ? req.body.port : currentSettings.port,
        model: req.body.model || currentSettings.model,
        timeout: req.body.timeout || currentSettings.timeout || 30000,
      };
    } else {
      settings = await getOllamaSettings();
    }

    // Test connection
    const connectionOk = await testConnection(settings);

    if (!connectionOk) {
      return res.status(200).json({
        success: false,
        message:
          'Failed to connect to Ollama. Please check if Ollama is running and the host/port are correct.',
      });
    }

    // Check if model is available
    const modelAvailable = await isModelAvailable(settings.model, settings);

    if (!modelAvailable) {
      return res.status(200).json({
        success: false,
        message: `Model "${settings.model}" is not available. Please ensure the model is installed in Ollama.`,
      });
    }

    res.json({
      success: true,
      message: `Successfully connected to Ollama and verified model "${settings.model}" is available.`,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(200).json({
        success: false,
        message: `Connection test failed: ${error.message}`,
      });
    }
    console.error('Failed to test Ollama connection:', error);
    res.status(500).json({ error: 'Failed to test Ollama connection' });
  }
});

export default router;
