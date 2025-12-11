import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import settingsRouter from '../settings';
import * as settingsDb from '../../db/settings';
import * as ollamaService from '../../services/ollama';
import { createTestDb } from '../../db/__tests__/helpers';
import { getDb, resetDb } from '../../db/database';

// Mock the database module
vi.mock('../../db/database', async () => {
  const actual = await vi.importActual('../../db/database');
  return {
    ...actual,
    getDb: vi.fn(),
  };
});

// Mock the settings database module
vi.mock('../../db/settings', () => ({
  getOllamaSettings: vi.fn(),
  updateOllamaSettings: vi.fn(),
}));

// Mock the ollama service module
vi.mock('../../services/ollama', () => ({
  testConnection: vi.fn(),
  isModelAvailable: vi.fn(),
}));

const mockGetDb = vi.mocked(getDb);
const mockGetOllamaSettings = vi.mocked(settingsDb.getOllamaSettings);
const mockUpdateOllamaSettings = vi.mocked(settingsDb.updateOllamaSettings);
const mockTestConnection = vi.mocked(ollamaService.testConnection);
const mockIsModelAvailable = vi.mocked(ollamaService.isModelAvailable);

const app = express();
app.use(express.json());
app.use('/settings', settingsRouter);

describe('Settings Routes', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
    testDb = createTestDb();
    mockGetDb.mockResolvedValue(testDb as any);
  });

  describe('GET /settings/ollama', () => {
    it('should return current Ollama settings', async () => {
      const settings = {
        enabled: true,
        host: 'localhost',
        port: 11434,
        model: 'llama3',
        timeout: 30000,
      };

      mockGetOllamaSettings.mockResolvedValue(settings);

      const response = await request(app).get('/settings/ollama');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(settings);
    });

    it('should handle database errors', async () => {
      mockGetOllamaSettings.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/settings/ollama');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch Ollama settings' });
    });
  });

  describe('PUT /settings/ollama', () => {
    it('should update Ollama settings', async () => {
      const updates = {
        enabled: true,
        host: '192.168.1.100',
        port: 11435,
        model: 'mistral',
      };

      const updatedSettings = {
        enabled: true,
        host: '192.168.1.100',
        port: 11435,
        model: 'mistral',
        timeout: 30000,
      };

      mockUpdateOllamaSettings.mockResolvedValue(updatedSettings);

      const response = await request(app).put('/settings/ollama').send(updates);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedSettings);
      expect(mockUpdateOllamaSettings).toHaveBeenCalledWith(updates);
    });

    it('should validate enabled field type', async () => {
      const response = await request(app)
        .put('/settings/ollama')
        .send({ enabled: 'not-a-boolean' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'enabled must be a boolean' });
    });

    it('should validate host field type', async () => {
      const response = await request(app).put('/settings/ollama').send({ host: 123 });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'host must be a string' });
    });

    it('should validate port field type', async () => {
      const response = await request(app).put('/settings/ollama').send({ port: 'not-a-number' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'port must be an integer' });
    });

    it('should validate model field type', async () => {
      const response = await request(app).put('/settings/ollama').send({ model: 123 });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'model must be a string' });
    });

    it('should validate timeout field type', async () => {
      const response = await request(app).put('/settings/ollama').send({ timeout: 'not-a-number' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'timeout must be an integer' });
    });

    it('should handle validation errors from database', async () => {
      mockUpdateOllamaSettings.mockRejectedValue(new Error('Port must be between 1 and 65535'));

      const response = await request(app).put('/settings/ollama').send({ port: 0 });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Port must be between 1 and 65535' });
    });

    it('should handle database errors', async () => {
      mockUpdateOllamaSettings.mockRejectedValue(new Error('Database error'));

      const response = await request(app).put('/settings/ollama').send({ enabled: true });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to update Ollama settings' });
    });
  });

  describe('POST /settings/ollama/test', () => {
    it('should test connection with current settings', async () => {
      const currentSettings = {
        enabled: true,
        host: 'localhost',
        port: 11434,
        model: 'llama3',
        timeout: 30000,
      };

      mockGetOllamaSettings.mockResolvedValue(currentSettings);
      mockTestConnection.mockResolvedValue(true);
      mockIsModelAvailable.mockResolvedValue(true);

      const response = await request(app).post('/settings/ollama/test');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Successfully connected to Ollama and verified model "llama3" is available.',
      });
      expect(mockTestConnection).toHaveBeenCalledWith(currentSettings);
      expect(mockIsModelAvailable).toHaveBeenCalledWith('llama3', currentSettings);
    });

    it('should test connection with provided settings', async () => {
      const testSettings = {
        host: '192.168.1.100',
        port: 11435,
        model: 'mistral',
      };

      const currentSettings = {
        enabled: true,
        host: 'localhost',
        port: 11434,
        model: 'llama3',
        timeout: 30000,
      };

      mockGetOllamaSettings.mockResolvedValue(currentSettings);
      mockTestConnection.mockResolvedValue(true);
      mockIsModelAvailable.mockResolvedValue(true);

      const response = await request(app).post('/settings/ollama/test').send(testSettings);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockTestConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          host: '192.168.1.100',
          port: 11435,
          model: 'mistral',
        })
      );
    });

    it('should return error when connection fails', async () => {
      const currentSettings = {
        enabled: true,
        host: 'localhost',
        port: 11434,
        model: 'llama3',
        timeout: 30000,
      };

      mockGetOllamaSettings.mockResolvedValue(currentSettings);
      mockTestConnection.mockResolvedValue(false);

      const response = await request(app).post('/settings/ollama/test');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: false,
        message:
          'Failed to connect to Ollama. Please check if Ollama is running and the host/port are correct.',
      });
    });

    it('should return error when model is not available', async () => {
      const currentSettings = {
        enabled: true,
        host: 'localhost',
        port: 11434,
        model: 'nonexistent-model',
        timeout: 30000,
      };

      mockGetOllamaSettings.mockResolvedValue(currentSettings);
      mockTestConnection.mockResolvedValue(true);
      mockIsModelAvailable.mockResolvedValue(false);

      const response = await request(app).post('/settings/ollama/test');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: false,
        message:
          'Model "nonexistent-model" is not available. Please ensure the model is installed in Ollama.',
      });
    });

    it('should handle connection test errors', async () => {
      const currentSettings = {
        enabled: true,
        host: 'localhost',
        port: 11434,
        model: 'llama3',
        timeout: 30000,
      };

      mockGetOllamaSettings.mockResolvedValue(currentSettings);
      mockTestConnection.mockRejectedValue(new Error('Connection timeout'));

      const response = await request(app).post('/settings/ollama/test');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: false,
        message: 'Connection test failed: Connection timeout',
      });
    });
  });
});
