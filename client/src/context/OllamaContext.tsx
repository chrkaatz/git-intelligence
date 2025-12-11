import { createContext, type ReactNode } from 'react';
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

// eslint-disable-next-line react-refresh/only-export-components
export const OllamaContext = createContext<OllamaContextType | undefined>(undefined);

export function OllamaProvider({ children }: { children: ReactNode }) {
  const ollamaSettings = useOllamaSettings();

  return <OllamaContext.Provider value={ollamaSettings}>{children}</OllamaContext.Provider>;
}
