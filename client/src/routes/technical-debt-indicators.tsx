import { createFileRoute } from '@tanstack/react-router';
import { TechnicalDebtIndicatorsView } from '../components/TechnicalDebtIndicatorsView';
import { BaseRouteRedirect } from '../components/BaseRouteRedirect';

export const Route = createFileRoute('/technical-debt-indicators')({
  component: () => (
    <BaseRouteRedirect targetRoute="/technical-debt-indicators">
      <TechnicalDebtIndicatorsView />
    </BaseRouteRedirect>
  ),
});
