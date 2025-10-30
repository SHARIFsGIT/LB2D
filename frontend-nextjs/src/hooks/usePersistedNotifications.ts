import { useEffect, useState, useCallback } from 'react';
import { notificationApi } from '@/lib/api';

export interface PersistedNotification {
  _id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  urgent: boolean;
  targetRole?: string;
  fromRole?: string;
  fromUserId?: string;
  data?: any;
  actionUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface UsePersistedNotificationsOptions {
  autoLoad?: boolean;
  unreadOnly?: boolean;
  pollInterval?: number; // in ms, for auto-refresh
}

export const usePersistedNotifications = (options: UsePersistedNotificationsOptions = {}) => {
  const { autoLoad = true, unreadOnly = false, pollInterval } = options;

  const [notifications, setNotifications] = useState<PersistedNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch notifications
  const fetchNotifications = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const response = await notificationApi.getAll({
        page: pageNum,
        limit: 20,
        unreadOnly
      });

      if (response.success && response.data) {
        const newNotifications = response.data.notifications;

        if (append) {
          setNotifications(prev => [...prev, ...newNotifications]);
        } else {
          setNotifications(newNotifications);
        }

        setHasMore(response.data.pagination.page < response.data.pagination.totalPages);
        setPage(pageNum);
      }
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationApi.getUnreadCount();
      if (response.success && response.data) {
        setUnreadCount(response.data.count);
      }
    } catch (err: any) {
      console.error('Error fetching unread count:', err);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await notificationApi.markAsRead(notificationId);

      if (response.success) {
        // Update local state
        setNotifications(prev =>
          prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
        );

        // Update unread count
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await notificationApi.markAllAsRead();

      if (response.success) {
        // Update local state
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (err: any) {
      console.error('Error marking all as read:', err);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await notificationApi.delete(notificationId);

      if (response.success) {
        // Update local state
        setNotifications(prev => prev.filter(n => n._id !== notificationId));

        // Update unread count if it was unread
        const wasUnread = notifications.find(n => n._id === notificationId)?.read === false;
        if (wasUnread) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (err: any) {
      console.error('Error deleting notification:', err);
    }
  }, [notifications]);

  // Delete all read notifications
  const deleteAllRead = useCallback(async () => {
    try {
      const response = await notificationApi.deleteAllRead();

      if (response.success) {
        // Update local state - keep only unread
        setNotifications(prev => prev.filter(n => !n.read));
      }
    } catch (err: any) {
      console.error('Error deleting read notifications:', err);
    }
  }, []);

  // Load more notifications (pagination)
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchNotifications(page + 1, true);
    }
  }, [loading, hasMore, page, fetchNotifications]);

  // Refresh notifications
  const refresh = useCallback(() => {
    fetchNotifications(1, false);
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  // Initial load
  useEffect(() => {
    if (autoLoad) {
      fetchNotifications(1, false);
      fetchUnreadCount();
    }
  }, [autoLoad, fetchNotifications, fetchUnreadCount]);

  // Polling for updates
  useEffect(() => {
    if (pollInterval && pollInterval > 0) {
      const interval = setInterval(() => {
        fetchUnreadCount();
        // Optionally refresh notifications too
        if (page === 1) {
          fetchNotifications(1, false);
        }
      }, pollInterval);

      return () => clearInterval(interval);
    }
  }, [pollInterval, page, fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    hasMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    loadMore,
    refresh
  };
};

export default usePersistedNotifications;
