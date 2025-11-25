import { createFileRoute } from '@tanstack/react-router';
import { RepositoryEvolutionView } from '../components/RepositoryEvolutionView';
import { RepositoryRouteWrapper } from '../components/RepositoryRouteWrapper';

export const Route = createFileRoute('/repository-evolution/$repoPath')({
  component: () => (
    <RepositoryRouteWrapper>
      <RepositoryEvolutionView />
    </RepositoryRouteWrapper>
  ),
});
