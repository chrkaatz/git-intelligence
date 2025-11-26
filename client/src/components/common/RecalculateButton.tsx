import { RefreshCw } from 'lucide-react';

interface RecalculateButtonProps {
  loading: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function RecalculateButton({
  loading,
  onClick,
  disabled,
  className = '',
}: RecalculateButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled ?? loading}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 ${className}`}
    >
      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Recalculating...' : 'Recalculate'}
    </button>
  );
}
