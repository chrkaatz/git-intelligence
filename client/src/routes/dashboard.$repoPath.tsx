import { createFileRoute } from '@tanstack/react-router';
import { DashboardView } from '../components/DashboardView';

export const Route = createFileRoute('/dashboard/$repoPath')({
  component: () => <DashboardView />,
});

