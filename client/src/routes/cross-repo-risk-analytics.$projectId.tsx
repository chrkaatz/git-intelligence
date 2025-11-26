import { createFileRoute } from '@tanstack/react-router';
import { CrossRepoRiskAnalyticsView } from '../components/CrossRepoRiskAnalyticsView';

export const Route = createFileRoute('/cross-repo-risk-analytics/$projectId')({
  component: () => <CrossRepoRiskAnalyticsView />,
});
