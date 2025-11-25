import { createFileRoute } from '@tanstack/react-router';
import { DashboardView } from '../components/DashboardView';
import { RepositoryRouteWrapper } from '../components/RepositoryRouteWrapper';

export const Route = createFileRoute('/dashboard/$repoPath')({
  component: () => (
    <RepositoryRouteWrapper>
      <DashboardView />
    </RepositoryRouteWrapper>
  ),
});
