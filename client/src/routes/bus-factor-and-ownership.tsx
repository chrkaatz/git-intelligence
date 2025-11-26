import { createFileRoute } from '@tanstack/react-router';
import { BusFactorAndOwnershipView } from '../components/busFactor/BusFactorAndOwnershipView';
import { BaseRouteRedirect } from '../components/BaseRouteRedirect';

export const Route = createFileRoute('/bus-factor-and-ownership')({
  component: () => (
    <BaseRouteRedirect targetRoute="/bus-factor-and-ownership">
      <BusFactorAndOwnershipView />
    </BaseRouteRedirect>
  ),
});
