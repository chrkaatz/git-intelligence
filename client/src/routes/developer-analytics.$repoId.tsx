import { createFileRoute } from '@tanstack/react-router';
import { DeveloperAnalyticsView } from '../components/DeveloperAnalyticsView';
import { RepositoryRouteWrapper } from '../components/RepositoryRouteWrapper';

export const Route = createFileRoute('/developer-analytics/$repoId')({
  component: () => (
    <RepositoryRouteWrapper>
      <DeveloperAnalyticsView />
    </RepositoryRouteWrapper>
  ),
});
