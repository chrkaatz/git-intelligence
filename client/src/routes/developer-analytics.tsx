import { createFileRoute } from '@tanstack/react-router';
import { DeveloperAnalyticsView } from '../components/DeveloperAnalyticsView';

export const Route = createFileRoute('/developer-analytics')({
  component: () => <DeveloperAnalyticsView />,
});
