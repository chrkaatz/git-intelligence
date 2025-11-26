import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react';

export type NotificationType = 'info' | 'success' | 'error' | 'loading';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number; // in milliseconds, 0 = persistent
}

interface NotificationContextType {
  showNotification: (type: NotificationType, message: string, duration?: number) => string;
  removeNotification: (id: string) => void;
  updateNotification: (
    id: string,
    type: NotificationType,
    message: string,
    duration?: number
  ) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showNotification = useCallback(
    (type: NotificationType, message: string, duration: number = 5000) => {
      let notificationId = '';

      // Deduplicate: don't show the same message if it already exists
      setNotifications((prev) => {
        const existing = prev.find((n) => n.message === message && n.type === type);
        if (existing) {
          notificationId = existing.id;
          return prev; // Don't add duplicate
        }

        const id = Math.random().toString(36).substring(2, 9);
        notificationId = id;
        const notification: Notification = { id, type, message, duration };

        if (duration > 0) {
          setTimeout(() => {
            removeNotification(id);
          }, duration);
        }

        return [...prev, notification];
      });

      return notificationId;
    },
    [removeNotification]
  );

  const updateNotification = useCallback(
    (id: string, type: NotificationType, message: string, duration: number = 0) => {
      setNotifications((prev) => {
        const existing = prev.find((n) => n.id === id);
        if (!existing) {
          return prev; // Notification doesn't exist
        }

        return prev.map((n) =>
          n.id === id
            ? { ...n, type, message, duration: duration !== undefined ? duration : n.duration }
            : n
        );
      });
    },
    []
  );

  return (
    <NotificationContext.Provider
      value={{ showNotification, removeNotification, updateNotification }}
    >
      {children}
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
    </NotificationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

function NotificationContainer({
  notifications,
  onRemove,
}: {
  notifications: Notification[];
  onRemove: (id: string) => void;
}) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full">
      {notifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} onRemove={onRemove} />
      ))}
    </div>
  );
}

function NotificationItem({
  notification,
  onRemove,
}: {
  notification: Notification;
  onRemove: (id: string) => void;
}) {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'loading':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBgColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/80 border-green-200 dark:border-green-700';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/80 border-red-200 dark:border-red-700';
      case 'loading':
        return 'bg-blue-50 dark:bg-blue-900/80 border-blue-200 dark:border-blue-700';
      default:
        return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  const getTextColor = () => {
    switch (notification.type) {
      case 'success':
        return 'text-green-800 dark:text-green-200';
      case 'error':
        return 'text-red-800 dark:text-red-200';
      case 'loading':
        return 'text-blue-800 dark:text-blue-200';
      default:
        return 'text-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div
      className={`${getBgColor()} ${getTextColor()} border rounded-lg shadow-lg p-4 flex items-start gap-3 animate-in slide-in-from-right-full duration-300`}
    >
      <div className="shrink-0">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{notification.message}</p>
      </div>
      {notification.duration !== 0 && (
        <button
          onClick={() => onRemove(notification.id)}
          className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
