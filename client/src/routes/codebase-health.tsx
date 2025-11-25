import { createFileRoute } from '@tanstack/react-router';
import { CodebaseHealthView } from '../components/CodebaseHealthView';

export const Route = createFileRoute('/codebase-health')({
  component: () => <CodebaseHealthView />,
});
