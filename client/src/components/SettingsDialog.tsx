import { useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { clearCache } from '../api';
import { useNotifications } from '../context/NotificationContext';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  currentRepoId?: string;
}

export function SettingsDialog({ open, onClose, currentRepoId }: SettingsDialogProps) {
  const [clearingCache, setClearingCache] = useState(false);
  const { showNotification } = useNotifications();

  const handleClearCache = async (repoId?: string) => {
    if (
      !confirm(
        `Are you sure you want to clear the ${repoId ? 'repository' : 'all'} cache? This will force recalculation of all analytics on next load.`
      )
    ) {
      return;
    }

    setClearingCache(true);
    try {
      await clearCache(repoId);
      showNotification(
        'success',
        repoId ? 'Repository cache cleared successfully!' : 'All cache cleared successfully!',
        3000
      );
    } catch (error: unknown) {
      const errorMessage =
        (error as { response?: { data?: { error?: string } }; message?: string })?.response?.data
          ?.error ||
        (error as { message?: string })?.message ||
        'Failed to clear cache';
      showNotification('error', errorMessage, 5000);
    } finally {
      setClearingCache(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"
      />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="w-full max-w-md transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl transition duration-300 ease-in-out data-closed:scale-95 data-closed:opacity-0"
        >
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Settings
            </DialogTitle>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="px-6 py-4 space-y-6">
            {/* Cache Management Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Cache Management
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Clear cached analytics data to force recalculation. The cache automatically
                invalidates when repositories have new commits.
              </p>

              <div className="space-y-3">
                {currentRepoId && (
                  <button
                    onClick={() => handleClearCache(currentRepoId)}
                    disabled={clearingCache}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <TrashIcon className="h-5 w-5" />
                    {clearingCache ? 'Clearing...' : 'Clear Repository Cache'}
                  </button>
                )}

                <button
                  onClick={() => handleClearCache()}
                  disabled={clearingCache}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <TrashIcon className="h-5 w-5" />
                  {clearingCache ? 'Clearing...' : 'Clear All Cache'}
                </button>
              </div>
            </div>

            {/* Cache Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                <strong>Note:</strong> The cache uses commit-hash-based invalidation. Analytics are
                automatically recalculated when repositories have new commits, so manual cache
                clearing is typically not necessary.
              </p>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
