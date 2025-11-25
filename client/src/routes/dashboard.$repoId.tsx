import { createFileRoute } from '@tanstack/react-router';
import { DashboardView } from '../components/DashboardView';
import { RepositoryRouteWrapper } from '../components/RepositoryRouteWrapper';

export const Route = createFileRoute('/dashboard/$repoId')({
  component: () => (
    <RepositoryRouteWrapper>
      <DashboardView />
    </RepositoryRouteWrapper>
  ),
});
