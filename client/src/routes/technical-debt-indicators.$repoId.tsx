import { createFileRoute } from '@tanstack/react-router';
import { TechnicalDebtIndicatorsView } from '../components/TechnicalDebtIndicatorsView';
import { RepositoryRouteWrapper } from '../components/RepositoryRouteWrapper';

export const Route = createFileRoute('/technical-debt-indicators/$repoId')({
  component: () => (
    <RepositoryRouteWrapper>
      <TechnicalDebtIndicatorsView />
    </RepositoryRouteWrapper>
  ),
});
