import { createFileRoute } from '@tanstack/react-router';
import { CrossRepoTechnicalDebtIndicatorsView } from '../components/CrossRepoTechnicalDebtIndicatorsView';

export const Route = createFileRoute('/cross-repo-technical-debt-indicators/$projectId')({
  component: () => <CrossRepoTechnicalDebtIndicatorsView />,
});
