import { createFileRoute } from '@tanstack/react-router';
import { ReadinessDiagnosticsView } from '../components/ReadinessDiagnosticsView';
import { BaseRouteRedirect } from '../components/BaseRouteRedirect';

export const Route = createFileRoute('/readiness-diagnostics')({
  component: () => (
    <BaseRouteRedirect targetRoute="/readiness-diagnostics">
      <ReadinessDiagnosticsView />
    </BaseRouteRedirect>
  ),
});
