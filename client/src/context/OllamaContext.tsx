import { createContext, useContext, type ReactNode } from 'react';
import { useOllamaSettings } from '../hooks/useOllamaSettings';
import type { OllamaSettings, OllamaTestResult } from '../api';

export interface OllamaContextType {
  settings: OllamaSettings;
  loading: boolean;
  error: string | null;
  synced: boolean;
  updateSettings: (settings: Partial<OllamaSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  testConnection: (testSettings?: Partial<OllamaSettings>) => Promise<OllamaTestResult>;
  getSettings: () => OllamaSettings;
  reloadSettings: () => Promise<void>;
}

const OllamaContext = createContext<OllamaContextType | undefined>(undefined);

export function OllamaProvider({ children }: { children: ReactNode }) {
  const ollamaSettings = useOllamaSettings();

  return <OllamaContext.Provider value={ollamaSettings}>{children}</OllamaContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOllama() {
  const context = useContext(OllamaContext);
  if (!context) {
    throw new Error('useOllama must be used within an OllamaProvider');
  }
  return context;
}
