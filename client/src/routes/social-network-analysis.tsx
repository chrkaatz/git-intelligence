import { createFileRoute } from '@tanstack/react-router';
import { SocialNetworkAnalysisView } from '../components/SocialNetworkAnalysisView';
import { BaseRouteRedirect } from '../components/BaseRouteRedirect';

export const Route = createFileRoute('/social-network-analysis')({
  component: () => (
    <BaseRouteRedirect targetRoute="/social-network-analysis">
      <SocialNetworkAnalysisView />
    </BaseRouteRedirect>
  ),
});
