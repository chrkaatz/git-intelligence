import { createFileRoute } from '@tanstack/react-router';
import { CrossRepoReadinessDiagnosticsView } from '../components/CrossRepoReadinessDiagnosticsView';

export const Route = createFileRoute('/cross-repo-readiness-diagnostics/$projectId')({
  component: () => <CrossRepoReadinessDiagnosticsView />,
});
