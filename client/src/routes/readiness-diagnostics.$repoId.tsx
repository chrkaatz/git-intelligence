import { createFileRoute } from '@tanstack/react-router';
import { ReadinessDiagnosticsView } from '../components/ReadinessDiagnosticsView';
import { RepositoryRouteWrapper } from '../components/RepositoryRouteWrapper';

export const Route = createFileRoute('/readiness-diagnostics/$repoId')({
  component: () => (
    <RepositoryRouteWrapper>
      <ReadinessDiagnosticsView />
    </RepositoryRouteWrapper>
  ),
});
