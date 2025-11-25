import { createFileRoute } from '@tanstack/react-router';
import { CrossRepoCodebaseHealthView } from '../components/CrossRepoCodebaseHealthView';

export const Route = createFileRoute('/cross-repo-codebase-health/$projectId')({
  component: () => <CrossRepoCodebaseHealthView />,
});
