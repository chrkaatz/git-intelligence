import { useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  showDontShowAgain?: boolean;
  onDontShowAgainChange?: (checked: boolean) => void;
}

export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  variant = 'warning',
  showDontShowAgain = false,
  onDontShowAgainChange,
}: ConfirmationDialogProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleConfirm = () => {
    if (onDontShowAgainChange) {
      onDontShowAgainChange(dontShowAgain);
    }
    onConfirm();
    setDontShowAgain(false);
  };

  const handleCancel = () => {
    setDontShowAgain(false);
    onClose();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: 'text-red-600 dark:text-red-400',
          confirmButton:
            'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600',
        };
      case 'warning':
        return {
          icon: 'text-yellow-600 dark:text-yellow-400',
          confirmButton:
            'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600',
        };
      default:
        return {
          icon: 'text-blue-600 dark:text-blue-400',
          confirmButton:
            'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Dialog open={open} onClose={handleCancel} className="relative z-[60]">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"
      />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="w-full max-w-md transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl transition duration-300 ease-in-out data-closed:scale-95 data-closed:opacity-0"
        >
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 ${styles.icon}`}>
                <ExclamationTriangleIcon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                {title && (
                  <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {title}
                  </DialogTitle>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
              </div>
            </div>

            {showDontShowAgain && (
              <div className="mt-4 flex items-center">
                <input
                  type="checkbox"
                  id="dont-show-again"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                />
                <label
                  htmlFor="dont-show-again"
                  className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  Don't show this again
                </label>
              </div>
            )}

            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`px-4 py-2 rounded-lg transition-colors ${styles.confirmButton}`}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
