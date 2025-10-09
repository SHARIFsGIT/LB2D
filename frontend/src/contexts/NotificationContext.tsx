import React, { createContext, useCallback, useState } from 'react';
import { NotificationProps } from '../components/Notification';

export interface NotificationData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
}

interface NotificationContextType {
  notifications: NotificationData[];
  addNotification: (notification: Omit<NotificationData, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  showSuccess: (message: string, title?: string, options?: Partial<NotificationData>) => string;
  showError: (message: string, title?: string, options?: Partial<NotificationData>) => string;
  showWarning: (message: string, title?: string, options?: Partial<NotificationData>) => string;
  showInfo: (message: string, title?: string, options?: Partial<NotificationData>) => string;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const addNotification = useCallback((notification: Omit<NotificationData, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: NotificationData = {
      ...notification,
      id,
      duration: notification.duration ?? 5000
    };

    setNotifications(prev => [...prev, newNotification]);
    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const showSuccess = useCallback((message: string, title?: string, options?: Partial<NotificationData>) => {
    return addNotification({
      type: 'success',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  const showError = useCallback((message: string, title?: string, options?: Partial<NotificationData>) => {
    return addNotification({
      type: 'error',
      title,
      message,
      duration: 8000, // Errors stay longer
      ...options
    });
  }, [addNotification]);

  const showWarning = useCallback((message: string, title?: string, options?: Partial<NotificationData>) => {
    return addNotification({
      type: 'warning',
      title,
      message,
      duration: 6000,
      ...options
    });
  }, [addNotification]);

  const showInfo = useCallback((message: string, title?: string, options?: Partial<NotificationData>) => {
    return addNotification({
      type: 'info',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  const value: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};