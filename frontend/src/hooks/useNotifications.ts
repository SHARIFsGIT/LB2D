import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { useWebSocket, NotificationData } from './useWebSocket';

export interface Notification extends NotificationData {
  id: string;
  read: boolean;
  timestamp: Date;
}

export const useNotifications = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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
        
        // Add role-specific styling
        if (notification.urgent) {
          notificationOptions.vibrate = [200, 100, 200];
        }
        
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

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Remove specific notification
  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(n => n.id !== notificationId);
    });
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
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
    requestPermission
  };
};