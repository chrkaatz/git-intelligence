import { createFileRoute } from '@tanstack/react-router';
import { RiskAnalyticsView } from '../components/RiskAnalyticsView';
import { RepositoryRouteWrapper } from '../components/RepositoryRouteWrapper';

export const Route = createFileRoute('/risk-analytics/$repoId')({
  component: () => (
    <RepositoryRouteWrapper>
      <RiskAnalyticsView />
    </RepositoryRouteWrapper>
  ),
});
