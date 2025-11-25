import { createFileRoute } from '@tanstack/react-router';
import { CrossRepoBusFactorAndOwnershipView } from '../components/CrossRepoBusFactorAndOwnershipView';

export const Route = createFileRoute('/cross-repo-bus-factor-and-ownership/$projectId')({
  component: () => <CrossRepoBusFactorAndOwnershipView />,
});
