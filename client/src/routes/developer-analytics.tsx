import { createFileRoute } from '@tanstack/react-router';
import { DeveloperAnalyticsView } from '../components/DeveloperAnalyticsView';
import { BaseRouteRedirect } from '../components/BaseRouteRedirect';

export const Route = createFileRoute('/developer-analytics')({
  component: () => (
    <BaseRouteRedirect targetRoute="/developer-analytics">
      <DeveloperAnalyticsView />
    </BaseRouteRedirect>
  ),
});
