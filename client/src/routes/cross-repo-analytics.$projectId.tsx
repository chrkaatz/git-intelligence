import { createFileRoute } from '@tanstack/react-router';
import { CrossRepoAnalyticsPortfolioView } from '../components/crossRepo/CrossRepoAnalyticsPortfolioView';

export const Route = createFileRoute('/cross-repo-analytics/$projectId')({
  component: () => <CrossRepoAnalyticsPortfolioView />,
});
