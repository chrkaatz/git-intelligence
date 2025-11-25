import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useParams } from '@tanstack/react-router';

interface RepositoryRouteWrapperProps {
  children: ReactNode;
}

const LAST_SELECTED_REPO_KEY = 'lastSelectedRepository';

/**
 * Wrapper component that saves the current repository path as the last selected repository
 */
export function RepositoryRouteWrapper({ children }: RepositoryRouteWrapperProps) {
  const params = useParams({ strict: false }) as { repoId?: string };
  const repoId = params?.repoId;

  useEffect(() => {
    // Save the repository ID as last selected
    if (repoId && repoId.trim()) {
      localStorage.setItem(LAST_SELECTED_REPO_KEY, repoId);
    }
  }, [repoId]);

  return <>{children}</>;
}
