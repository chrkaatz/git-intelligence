import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getOllamaSettings, updateOllamaSettings } from '../settings';
import { getDb, resetDb } from '../database';
import { createTestDb } from './helpers';
import type { OllamaSettings } from '../types';

// Mock the database module
vi.mock('../database', async () => {
  const actual = await vi.importActual('../database');
  return {
    ...actual,
    getDb: vi.fn(),
  };
});

const mockGetDb = vi.mocked(getDb);

describe('settings', () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    resetDb();
    testDb = createTestDb();
    mockGetDb.mockResolvedValue(testDb as any);
  });

  describe('getOllamaSettings', () => {
    it('should return default settings when no settings exist', async () => {
      const settings = await getOllamaSettings();

      expect(settings).toEqual({
        enabled: false,
        host: 'localhost',
        port: 11434,
        model: 'llama3',
        timeout: 30000,
      });
    });

    it('should return existing settings when they exist', async () => {
      const existingSettings: OllamaSettings = {
        enabled: true,
        host: '192.168.1.100',
        port: 11435,
        model: 'mistral',
        timeout: 60000,
      };

      testDb.data.ollamaSettings = existingSettings;
      await testDb.write();

      const settings = await getOllamaSettings();
      expect(settings).toEqual(existingSettings);
    });

    it('should initialize and save defaults if settings do not exist', async () => {
      testDb.data.ollamaSettings = undefined;
      await testDb.write();

      const settings = await getOllamaSettings();

      expect(settings).toEqual({
        enabled: false,
        host: 'localhost',
        port: 11434,
        model: 'llama3',
        timeout: 30000,
      });

      // Verify settings were saved
      await testDb.read();
      expect(testDb.data.ollamaSettings).toEqual(settings);
    });
  });

  describe('updateOllamaSettings', () => {
    it('should update all settings', async () => {
      const updates: Partial<OllamaSettings> = {
        enabled: true,
        host: '192.168.1.100',
        port: 11435,
        model: 'mistral',
        timeout: 60000,
      };

      const updated = await updateOllamaSettings(updates);

      expect(updated).toEqual({
        enabled: true,
        host: '192.168.1.100',
        port: 11435,
        model: 'mistral',
        timeout: 60000,
      });

      // Verify settings were saved
      await testDb.read();
      expect(testDb.data.ollamaSettings).toEqual(updated);
    });

    it('should update partial settings', async () => {
      // Set initial settings
      testDb.data.ollamaSettings = {
        enabled: false,
        host: 'localhost',
        port: 11434,
        model: 'llama3',
        timeout: 30000,
      };
      await testDb.write();

      const updates: Partial<OllamaSettings> = {
        enabled: true,
        model: 'mistral',
      };

      const updated = await updateOllamaSettings(updates);

      expect(updated.enabled).toBe(true);
      expect(updated.model).toBe('mistral');
      expect(updated.host).toBe('localhost'); // Should keep existing value
      expect(updated.port).toBe(11434); // Should keep existing value
    });

    it('should throw error for invalid port (too low)', async () => {
      const updates: Partial<OllamaSettings> = {
        port: 0,
      };

      await expect(updateOllamaSettings(updates)).rejects.toThrow(
        'Port must be between 1 and 65535'
      );
    });

    it('should throw error for invalid port (too high)', async () => {
      const updates: Partial<OllamaSettings> = {
        port: 65536,
      };

      await expect(updateOllamaSettings(updates)).rejects.toThrow(
        'Port must be between 1 and 65535'
      );
    });

    it('should throw error for invalid timeout (too low)', async () => {
      const updates: Partial<OllamaSettings> = {
        timeout: 500,
      };

      await expect(updateOllamaSettings(updates)).rejects.toThrow(
        'Timeout must be between 1000ms and 300000ms'
      );
    });

    it('should throw error for invalid timeout (too high)', async () => {
      const updates: Partial<OllamaSettings> = {
        timeout: 400000,
      };

      await expect(updateOllamaSettings(updates)).rejects.toThrow(
        'Timeout must be between 1000ms and 300000ms'
      );
    });

    it('should throw error for empty host', async () => {
      // First set up initial settings
      testDb.data.ollamaSettings = {
        enabled: false,
        host: 'localhost',
        port: 11434,
        model: 'llama3',
        timeout: 30000,
      };
      await testDb.write();

      const updates: Partial<OllamaSettings> = {
        host: '   ', // Whitespace only should fail
      };

      await expect(updateOllamaSettings(updates)).rejects.toThrow('Host cannot be empty');
    });

    it('should throw error for empty model', async () => {
      // First set up initial settings
      testDb.data.ollamaSettings = {
        enabled: false,
        host: 'localhost',
        port: 11434,
        model: 'llama3',
        timeout: 30000,
      };
      await testDb.write();

      const updates: Partial<OllamaSettings> = {
        model: '   ', // Whitespace only should fail
      };

      await expect(updateOllamaSettings(updates)).rejects.toThrow('Model name cannot be empty');
    });

    it('should use defaults when updating from empty database', async () => {
      testDb.data.ollamaSettings = undefined;
      await testDb.write();

      const updates: Partial<OllamaSettings> = {
        enabled: true,
      };

      const updated = await updateOllamaSettings(updates);

      expect(updated.enabled).toBe(true);
      expect(updated.host).toBe('localhost');
      expect(updated.port).toBe(11434);
      expect(updated.model).toBe('llama3');
      expect(updated.timeout).toBe(30000);
    });
  });
});
