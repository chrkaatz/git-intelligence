import { createFileRoute } from '@tanstack/react-router';
import { BusFactorAndOwnershipView } from '../components/BusFactorAndOwnershipView';
import { RepositoryRouteWrapper } from '../components/RepositoryRouteWrapper';

export const Route = createFileRoute('/bus-factor-and-ownership/$repoPath')({
  component: () => (
    <RepositoryRouteWrapper>
      <BusFactorAndOwnershipView />
    </RepositoryRouteWrapper>
  ),
});
