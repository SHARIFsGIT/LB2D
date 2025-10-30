import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { useWebSocket, NotificationData } from './useWebSocket';
import { notificationApi } from '@/lib/api';

export interface Notification extends NotificationData {
  id: string;
  read: boolean;
  timestamp: Date;
}

export const useNotifications = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Handle incoming WebSocket notifications
  const handleNotification = useCallback((notification: NotificationData) => {
    const newNotification: Notification = {
      ...notification,
      id: notification.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      read: false,
      timestamp: new Date(notification.timestamp || new Date())
    };

    // Enhanced role-based relevance check
    const isRelevant = () => {
      if (!notification.targetRole || notification.targetRole === 'all') {
        return true;
      }

      if (notification.targetRole === user?.role) {
        return true;
      }

      // Special case: if notification is specifically for this user
      if (notification.userId && notification.userId === user?.id) {
        return true;
      }

      // Role hierarchy notifications
      if (user?.role === 'Admin') {
        // Admins see all notifications
        return true;
      }

      if (user?.role === 'Supervisor') {
        // Supervisors see admin and student notifications
        return ['Admin', 'Student', 'Supervisor'].includes(notification.targetRole);
      }

      if (user?.role === 'Student') {
        // Students see admin and supervisor notifications directed to them
        return ['Admin', 'Supervisor', 'Student'].includes(notification.targetRole);
      }

      return false;
    };

    if (isRelevant()) {
      setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep last 50
      setUnreadCount(prev => prev + 1);

      // Enhanced browser notification with role-specific styling
      if (Notification.permission === 'granted') {
        const notificationOptions: NotificationOptions = {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.id,
          badge: '/favicon.ico',
          requireInteraction: notification.urgent || false
        };

        new Notification(notification.title, notificationOptions);
      }

      // Log notification for debugging
    }
  }, [user?.role, user?.id]);

  // WebSocket connection for real-time notifications
  const { isConnected } = useWebSocket({
    onNotification: handleNotification,
    onConnect: () => {
    }
  });

  // Fetch persisted notifications from database
  const fetchPersistedNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await notificationApi.getAll({ page: 1, limit: 50 });

      if (response.success && response.data) {
        const persisted = response.data.notifications;

        // Convert to Notification format
        const converted: Notification[] = persisted.map((n: { _id: string; type: string; title: string; message: string; read: boolean; urgent: boolean; createdAt: string; data?: any; targetRole?: string; fromRole?: string }) => ({
          id: n._id,
          type: n.type,
          title: n.title,
          message: n.message,
          read: n.read,
          urgent: n.urgent,
          timestamp: new Date(n.createdAt),
          data: n.data,
          targetRole: n.targetRole,
          fromRole: n.fromRole
        }));

        setNotifications(converted);
      }
    } catch (error) {
      console.error('Error fetching persisted notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationApi.getUnreadCount();
      if (response.success && response.data) {
        setUnreadCount(response.data.count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  // Load persisted notifications on mount
  useEffect(() => {
    if (user) {
      fetchPersistedNotifications();
      fetchUnreadCount();
    }
  }, [user, fetchPersistedNotifications, fetchUnreadCount]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Update in database
      await notificationApi.markAsRead(notificationId);

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Still update locally even if API fails
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      // Update in database
      await notificationApi.markAllAsRead();

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, []);

  // Clear all notifications
  const clearAll = useCallback(async () => {
    try {
      // Delete all read notifications from database
      await notificationApi.deleteAllRead();

      // Keep only unread in local state
      setNotifications(prev => prev.filter(n => !n.read));
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }, []);

  // Remove specific notification
  const removeNotification = useCallback(async (notificationId: string) => {
    try {
      // Delete from database
      await notificationApi.delete(notificationId);

      // Update local state
      setNotifications(prev => {
        const notification = prev.find(n => n.id === notificationId);
        if (notification && !notification.read) {
          setUnreadCount(count => Math.max(0, count - 1));
        }
        return prev.filter(n => n.id !== notificationId);
      });
    } catch (error) {
      console.error('Error removing notification:', error);
    }
  }, []);

  // Request browser notification permission
  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  // Update unread count when notifications change
  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  // Request notification permission on mount
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  return {
    notifications,
    unreadCount,
    isConnected,
    loading,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
    requestPermission,
    refresh: fetchPersistedNotifications
  };
};
