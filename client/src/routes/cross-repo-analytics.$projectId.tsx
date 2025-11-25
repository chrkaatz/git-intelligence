import { createFileRoute } from '@tanstack/react-router';
import { CrossRepoDeveloperAnalyticsView } from '../components/CrossRepoDeveloperAnalyticsView';

export const Route = createFileRoute('/cross-repo-analytics/$projectId')({
  component: () => <CrossRepoDeveloperAnalyticsView />,
});

