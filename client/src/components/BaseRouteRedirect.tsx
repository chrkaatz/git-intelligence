import { useEffect, useRef } from 'react';
import { useNavigate, useParams, useRouterState } from '@tanstack/react-router';

interface BaseRouteRedirectProps {
  targetRoute: string;
  children: React.ReactNode;
}

/**
 * Component that redirects to the last selected repository if available
 * Used in base routes (without repoId parameter)
 */
export function BaseRouteRedirect({ targetRoute, children }: BaseRouteRedirectProps) {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { repoId?: string };
  const router = useRouterState();
  const hasRedirected = useRef(false);

  // Check if we're already on a repo-specific route by checking params or pathname
  const currentPath = router.location.pathname;
  const isRepoSpecificRoute =
    params?.repoId || (currentPath !== targetRoute && currentPath.startsWith(targetRoute + '/'));

  useEffect(() => {
    // If we're already on a repo-specific route, don't redirect
    if (isRepoSpecificRoute) return;

    // Only attempt redirect once
    if (hasRedirected.current) return;

    // Check for last selected repository and redirect if available
    const lastSelectedRepo = localStorage.getItem('lastSelectedRepository');
    if (lastSelectedRepo && lastSelectedRepo.trim()) {
      hasRedirected.current = true;
      // Construct the full route path
      const fullRoute = `${targetRoute}/$repoId` as any;
      // Redirect to the repo-specific route
      navigate({
        to: fullRoute as any,
        params: { repoId: lastSelectedRepo } as any,
        replace: true,
      });
    }
  }, [targetRoute, navigate, isRepoSpecificRoute]);

  // Show children (redirect will happen in useEffect if needed)
  return <>{children}</>;
}
