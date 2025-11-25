import { createFileRoute } from '@tanstack/react-router';
import { SocialNetworkAnalysisView } from '../components/SocialNetworkAnalysisView';

export const Route = createFileRoute('/social-network-analysis')({
  component: () => <SocialNetworkAnalysisView />,
});
