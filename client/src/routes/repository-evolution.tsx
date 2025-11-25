import { createFileRoute } from '@tanstack/react-router';
import { RepositoryEvolutionView } from '../components/RepositoryEvolutionView';
import { BaseRouteRedirect } from '../components/BaseRouteRedirect';

export const Route = createFileRoute('/repository-evolution')({
  component: () => (
    <BaseRouteRedirect targetRoute="/repository-evolution">
      <RepositoryEvolutionView />
    </BaseRouteRedirect>
  ),
});
