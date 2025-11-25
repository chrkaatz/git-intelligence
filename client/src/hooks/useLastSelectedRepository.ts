import { useEffect } from 'react';

const LAST_SELECTED_REPO_KEY = 'lastSelectedRepository';

/**
 * Hook to manage the last selected repository path in localStorage
 */
export function useLastSelectedRepository() {
  /**
   * Get the last selected repository path
   */
  const getLastSelectedRepository = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(LAST_SELECTED_REPO_KEY);
  };

  /**
   * Set the last selected repository path
   */
  const setLastSelectedRepository = (repoPath: string | null): void => {
    if (typeof window === 'undefined') return;
    if (repoPath) {
      localStorage.setItem(LAST_SELECTED_REPO_KEY, repoPath);
    } else {
      localStorage.removeItem(LAST_SELECTED_REPO_KEY);
    }
  };

  /**
   * Clear the last selected repository
   */
  const clearLastSelectedRepository = (): void => {
    setLastSelectedRepository(null);
  };

  return {
    getLastSelectedRepository,
    setLastSelectedRepository,
    clearLastSelectedRepository,
  };
}

/**
 * Hook to automatically save the current repository path as last selected
 * when visiting a repository-specific route
 */
export function useSaveLastSelectedRepository(repoPath: string | undefined) {
  useEffect(() => {
    if (repoPath && typeof window !== 'undefined') {
      localStorage.setItem(LAST_SELECTED_REPO_KEY, repoPath);
    }
  }, [repoPath]);
}
