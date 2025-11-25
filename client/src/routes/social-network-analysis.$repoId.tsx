import { createFileRoute } from '@tanstack/react-router';
import { SocialNetworkAnalysisView } from '../components/SocialNetworkAnalysisView';
import { RepositoryRouteWrapper } from '../components/RepositoryRouteWrapper';

export const Route = createFileRoute('/social-network-analysis/$repoId')({
  component: () => (
    <RepositoryRouteWrapper>
      <SocialNetworkAnalysisView />
    </RepositoryRouteWrapper>
  ),
});
