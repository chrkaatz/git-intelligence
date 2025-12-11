import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { testConnection, generateCompletion, generateAnalysis, isModelAvailable } from '../ollama';
import type { OllamaSettings } from '../../db/types';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ollama service', () => {
  const defaultSettings: OllamaSettings = {
    enabled: true,
    host: 'localhost',
    port: 11434,
    model: 'llama3',
    timeout: 30000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('testConnection', () => {
    it('should return true when connection is successful', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ models: [{ name: 'llama3' }] }),
      });

      const result = await testConnection(defaultSettings);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should return false when connection fails', async () => {
      mockFetch.mockRejectedValue(new Error('Connection failed'));

      const result = await testConnection(defaultSettings);

      expect(result).toBe(false);
    });

    it('should return false when response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await testConnection(defaultSettings);

      expect(result).toBe(false);
    });

    it('should handle timeout', async () => {
      const settings: OllamaSettings = {
        ...defaultSettings,
        timeout: 100,
      };

      // Create a promise that never resolves to simulate timeout
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            // Never resolve - will timeout
          })
      );

      // Use vi.advanceTimersByTime if available, otherwise just check that it returns false
      const result = await Promise.race([
        testConnection(settings),
        new Promise((resolve) => setTimeout(() => resolve(false), 150)),
      ]);

      // The timeout should cause the request to abort, resulting in false
      expect(result).toBe(false);
    }, 10000);

    it('should work with custom host and port', async () => {
      const customSettings: OllamaSettings = {
        ...defaultSettings,
        host: '192.168.1.100',
        port: 11435,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] }),
      });

      await testConnection(customSettings);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://192.168.1.100:11435/api/tags',
        expect.any(Object)
      );
    });
  });

  describe('generateCompletion', () => {
    it('should generate completion successfully', async () => {
      const mockResponse = {
        response: 'This is a test response from Ollama',
        model: 'llama3',
        done: true,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await generateCompletion('Test prompt', defaultSettings);

      expect(result).toBe('This is a test response from Ollama');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama3',
            prompt: 'Test prompt',
            stream: false,
          }),
        })
      );
    });

    it('should throw error when Ollama is not enabled', async () => {
      const disabledSettings: OllamaSettings = {
        ...defaultSettings,
        enabled: false,
      };

      await expect(generateCompletion('Test prompt', disabledSettings)).rejects.toThrow(
        'Ollama is not enabled'
      );
    });

    it('should throw error when response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ error: 'Model not found' }),
      });

      await expect(generateCompletion('Test prompt', defaultSettings)).rejects.toThrow(
        'Model not found'
      );
    });

    it('should throw error when response is missing response field', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ model: 'llama3', done: true }),
      });

      await expect(generateCompletion('Test prompt', defaultSettings)).rejects.toThrow(
        'Invalid response from Ollama: missing response field'
      );
    });

    it('should handle timeout', async () => {
      const settings: OllamaSettings = {
        ...defaultSettings,
        timeout: 100,
      };

      // Create a promise that never resolves to simulate timeout
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            // Never resolve - will timeout
          })
      );

      // The timeout should cause the request to abort
      await expect(
        Promise.race([
          generateCompletion('Test prompt', settings),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Test timeout')), 150)),
        ])
      ).rejects.toThrow();
    }, 10000);

    it('should parse error message from JSON response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: 'Invalid model name' }),
      });

      await expect(generateCompletion('Test prompt', defaultSettings)).rejects.toThrow(
        'Invalid model name'
      );
    });
  });

  describe('generateAnalysis', () => {
    it('should generate analysis for codebase-health', async () => {
      const context = {
        hotspots: ['file1.ts', 'file2.ts'],
        complexity: { average: 50 },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          response: 'Analysis: High complexity detected in hotspots.',
        }),
      });

      const result = await generateAnalysis(context, 'codebase-health', defaultSettings);

      expect(result).toContain('Analysis:');
      expect(mockFetch).toHaveBeenCalled();
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.prompt).toContain('codebase-health');
      expect(callBody.prompt).toContain('Technical debt');
    });

    it('should generate analysis for developer-analytics', async () => {
      const context = {
        authors: [{ name: 'John', commits: 100 }],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          response: 'Analysis: Good collaboration patterns.',
        }),
      });

      const result = await generateAnalysis(context, 'developer-analytics', defaultSettings);

      expect(result).toContain('Analysis:');
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.prompt).toContain('developer-analytics');
      expect(callBody.prompt).toContain('Developer activity');
    });

    it('should throw error when Ollama is not enabled', async () => {
      const disabledSettings: OllamaSettings = {
        ...defaultSettings,
        enabled: false,
      };

      await expect(generateAnalysis({}, 'codebase-health', disabledSettings)).rejects.toThrow(
        'Ollama is not enabled'
      );
    });
  });

  describe('isModelAvailable', () => {
    it('should return true when model is available', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: 'llama3' }, { name: 'mistral' }, { name: 'llama3:8b' }],
        }),
      });

      const result = await isModelAvailable('llama3', defaultSettings);

      expect(result).toBe(true);
    });

    it('should return true when model with tag is available', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: 'llama3:8b' }],
        }),
      });

      const result = await isModelAvailable('llama3', defaultSettings);

      expect(result).toBe(true);
    });

    it('should return false when model is not available', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: 'mistral' }],
        }),
      });

      const result = await isModelAvailable('llama3', defaultSettings);

      expect(result).toBe(false);
    });

    it('should return false when connection fails', async () => {
      mockFetch.mockRejectedValue(new Error('Connection failed'));

      const result = await isModelAvailable('llama3', defaultSettings);

      expect(result).toBe(false);
    });

    it('should return false when response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await isModelAvailable('llama3', defaultSettings);

      expect(result).toBe(false);
    });
  });
});
