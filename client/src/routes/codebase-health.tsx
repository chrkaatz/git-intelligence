import { createFileRoute } from '@tanstack/react-router';
import { CodebaseHealthView } from '../components/CodebaseHealthView';
import { BaseRouteRedirect } from '../components/BaseRouteRedirect';

export const Route = createFileRoute('/codebase-health')({
  component: () => (
    <BaseRouteRedirect targetRoute="/codebase-health">
      <CodebaseHealthView />
    </BaseRouteRedirect>
  ),
});
