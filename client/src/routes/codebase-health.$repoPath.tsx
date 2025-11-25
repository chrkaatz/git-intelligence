import { createFileRoute } from '@tanstack/react-router';
import { CodebaseHealthView } from '../components/CodebaseHealthView';
import { RepositoryRouteWrapper } from '../components/RepositoryRouteWrapper';

export const Route = createFileRoute('/codebase-health/$repoPath')({
  component: () => (
    <RepositoryRouteWrapper>
      <CodebaseHealthView />
    </RepositoryRouteWrapper>
  ),
});
