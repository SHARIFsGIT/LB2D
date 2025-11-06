import { useState } from 'react';
import toast from 'react-hot-toast';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationData {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  timestamp: Date;
  read?: boolean;
}

export interface NotificationOptions {
  duration?: number;
  actions?: Array<{ label: string; onClick: () => void }>;
}

export const useNotification = () => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const showSuccess = (message: string, _title?: string, options?: NotificationOptions) => {
    toast.success(message, {
      duration: options?.duration || 3000,
      position: 'top-right',
    });
  };

  const showError = (message: string, _title?: string, options?: NotificationOptions) => {
    toast.error(message, {
      duration: options?.duration || 4000,
      position: 'top-right',
    });
  };

  const showInfo = (message: string, _title?: string, options?: NotificationOptions) => {
    toast(message, {
      duration: options?.duration || 3000,
      position: 'top-right',
      icon: 'ℹ️',
      style: {
        background: '#DBEAFE',
        color: '#1E40AF',
        border: '1px solid #60A5FA',
      },
    });
  };

  const showWarning = (message: string, _title?: string, options?: NotificationOptions) => {
    toast(message, {
      duration: options?.duration || 3500,
      position: 'top-right',
      icon: '⚠️',
      style: {
        background: '#FEF3C7',
        color: '#92400E',
        border: '1px solid #FCD34D',
      },
    });
  };

  const showNotification = (type: NotificationType, message: string) => {
    switch (type) {
      case 'success':
        showSuccess(message);
        break;
      case 'error':
        showError(message);
        break;
      case 'warning':
        showWarning(message);
        break;
      case 'info':
      default:
        showInfo(message);
        break;
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return { 
    notifications,
    showSuccess, 
    showError, 
    showInfo, 
    showWarning, 
    showNotification,
    removeNotification
  };
};
