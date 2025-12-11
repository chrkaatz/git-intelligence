import { useContext } from 'react';
import { OllamaContext } from '../context/OllamaContext';

/**
 * Hook to access the Ollama context
 * @throws {Error} If used outside of OllamaProvider
 */
export function useOllama() {
  const context = useContext(OllamaContext);
  if (context === undefined) {
    throw new Error('useOllama must be used within an OllamaProvider');
  }
  return context;
}
