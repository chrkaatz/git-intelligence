import { useContext } from 'react';
import { AppContext } from '../context/context';

/**
 * Hook to access the App context
 * @throws {Error} If used outside of AppProvider
 */
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
