import { createFileRoute } from '@tanstack/react-router';
import { DashboardView } from '../components/DashboardView';
import { BaseRouteRedirect } from '../components/BaseRouteRedirect';

export const Route = createFileRoute('/dashboard')({
  component: () => (
    <BaseRouteRedirect targetRoute="/dashboard">
      <DashboardView />
    </BaseRouteRedirect>
  ),
});
