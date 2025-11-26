import { createFileRoute } from '@tanstack/react-router';
import { RiskAnalyticsView } from '../components/RiskAnalyticsView';
import { BaseRouteRedirect } from '../components/BaseRouteRedirect';

export const Route = createFileRoute('/risk-analytics')({
  component: () => (
    <BaseRouteRedirect targetRoute="/risk-analytics">
      <RiskAnalyticsView />
    </BaseRouteRedirect>
  ),
});
