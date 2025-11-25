import { createFileRoute } from '@tanstack/react-router';
import { RepositoryEvolutionView } from '../components/RepositoryEvolutionView';

export const Route = createFileRoute('/repository-evolution/$repoPath')({
  component: () => <RepositoryEvolutionView />,
});
