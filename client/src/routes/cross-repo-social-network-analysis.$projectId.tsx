import { createFileRoute } from '@tanstack/react-router';
import { CrossRepoSocialNetworkAnalysisView } from '../components/CrossRepoSocialNetworkAnalysisView';

export const Route = createFileRoute('/cross-repo-social-network-analysis/$projectId')({
  component: () => <CrossRepoSocialNetworkAnalysisView />,
});
