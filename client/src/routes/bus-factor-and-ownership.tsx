import { createFileRoute } from '@tanstack/react-router';
import { BusFactorAndOwnershipView } from '../components/BusFactorAndOwnershipView';

export const Route = createFileRoute('/bus-factor-and-ownership')({
  component: () => <BusFactorAndOwnershipView />,
});
