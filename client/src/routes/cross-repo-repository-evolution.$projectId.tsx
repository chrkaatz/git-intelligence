import { createFileRoute } from '@tanstack/react-router';
import { CrossRepoRepositoryEvolutionView } from '../components/CrossRepoRepositoryEvolutionView';

export const Route = createFileRoute('/cross-repo-repository-evolution/$projectId')({
  component: () => <CrossRepoRepositoryEvolutionView />,
});
