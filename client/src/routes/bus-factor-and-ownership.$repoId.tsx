import { createFileRoute } from '@tanstack/react-router';
import { BusFactorAndOwnershipView } from '../components/busFactor/BusFactorAndOwnershipView';
import { RepositoryRouteWrapper } from '../components/RepositoryRouteWrapper';

export const Route = createFileRoute('/bus-factor-and-ownership/$repoId')({
  component: () => (
    <RepositoryRouteWrapper>
      <BusFactorAndOwnershipView />
    </RepositoryRouteWrapper>
  ),
});
