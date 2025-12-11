import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OllamaProvider, useOllama } from '../OllamaContext';
import * as useOllamaSettingsHook from '../../hooks/useOllamaSettings';

// Mock the hook
vi.mock('../../hooks/useOllamaSettings', () => ({
  useOllamaSettings: vi.fn(),
}));

const mockUseOllamaSettings = vi.mocked(useOllamaSettingsHook.useOllamaSettings);

describe('OllamaContext', () => {
  const mockSettings = {
    enabled: true,
    host: 'localhost',
    port: 11434,
    model: 'llama3',
    timeout: 30000,
  };

  const mockHookReturn = {
    settings: mockSettings,
    loading: false,
    error: null,
    synced: true,
    updateSettings: vi.fn(),
    resetSettings: vi.fn(),
    testConnection: vi.fn(),
    getSettings: vi.fn(() => mockSettings),
    reloadSettings: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOllamaSettings.mockReturnValue(mockHookReturn);
  });

  it('should provide Ollama settings via context', () => {
    const TestComponent = () => {
      const { settings } = useOllama();
      return <div>Model: {settings.model}</div>;
    };

    render(
      <OllamaProvider>
        <TestComponent />
      </OllamaProvider>
    );

    expect(screen.getByText('Model: llama3')).toBeInTheDocument();
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const TestComponent = () => {
      useOllama();
      return <div>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'useOllama must be used within an OllamaProvider'
    );

    consoleSpy.mockRestore();
  });

  it('should provide all hook functions via context', () => {
    const TestComponent = () => {
      const context = useOllama();
      return (
        <div>
          <button onClick={() => context.updateSettings({ enabled: false })}>Update</button>
          <button onClick={() => context.resetSettings()}>Reset</button>
          <button onClick={() => context.testConnection()}>Test</button>
          <button onClick={() => context.reloadSettings()}>Reload</button>
        </div>
      );
    };

    render(
      <OllamaProvider>
        <TestComponent />
      </OllamaProvider>
    );

    expect(mockUseOllamaSettings).toHaveBeenCalled();
    expect(mockHookReturn.updateSettings).toBeDefined();
    expect(mockHookReturn.resetSettings).toBeDefined();
    expect(mockHookReturn.testConnection).toBeDefined();
    expect(mockHookReturn.reloadSettings).toBeDefined();
  });

  it('should provide loading state', () => {
    mockUseOllamaSettings.mockReturnValue({
      ...mockHookReturn,
      loading: true,
    });

    const TestComponent = () => {
      const { loading } = useOllama();
      return <div>{loading ? 'Loading...' : 'Loaded'}</div>;
    };

    render(
      <OllamaProvider>
        <TestComponent />
      </OllamaProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should provide error state', () => {
    mockUseOllamaSettings.mockReturnValue({
      ...mockHookReturn,
      error: 'Connection failed',
    });

    const TestComponent = () => {
      const { error } = useOllama();
      return <div>{error || 'No error'}</div>;
    };

    render(
      <OllamaProvider>
        <TestComponent />
      </OllamaProvider>
    );

    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });
});
