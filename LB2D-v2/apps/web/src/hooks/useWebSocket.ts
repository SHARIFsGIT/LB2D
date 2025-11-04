import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import { appConfig } from '@/config/app.config';

export interface NotificationData {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'admin' | 'user_registration' | 'enrollment' | 'student_action' | 'assessment' | 'video_comment';
  message: string;
  title?: string;
  createdAt: string;
  read?: boolean;
  data?: {
    userId?: string;
    newRole?: string;
    [key: string]: any;
  };
}

export const useWebSocket = (): {
  socket: Socket | null;
  connected: boolean;
  isConnected: boolean;
  notifications: NotificationData[];
  emit: (event: string, data: any) => boolean;
  on: (event: string, callback: (...args: any[]) => void) => () => void;
  subscribe: (callback: (notification: NotificationData) => void) => () => void;
  clearNotifications: () => void;
  markAsRead: (id: string) => void;
} => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const { token, isAuthenticated } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const wsUrl = appConfig.ws.url || 'ws://localhost:3001';
    const newSocket = io(wsUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: appConfig.ws.reconnectInterval || 5000,
      reconnectionAttempts: appConfig.ws.maxReconnectAttempts || 5,
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    });

    newSocket.on('notification', (data: NotificationData) => {
      console.log('Received notification:', data);
      setNotifications((prev) => [data, ...prev]);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      console.log('Cleaning up WebSocket connection');
      newSocket.disconnect();
    };
  }, [isAuthenticated, token]);

  const emit = (event: string, data: any) => {
    if (socket && connected) {
      socket.emit(event, data);
      return true;
    }
    console.warn('Cannot emit event: Socket not connected');
    return false;
  };

  const on = (event: string, callback: (...args: any[]) => void) => {
    if (socket) {
      socket.on(event, callback);
      return () => socket.off(event, callback);
    }
    return () => {};
  };

  // Subscribe method for backwards compatibility - accepts a callback
  const subscribe = (callback: (notification: NotificationData) => void) => {
    if (socket) {
      socket.on('notification', callback);
      return () => socket.off('notification', callback);
    }
    return () => {};
  };

  return {
    socket,
    connected,
    isConnected: connected,
    notifications,
    emit,
    on,
    subscribe,
    clearNotifications: () => setNotifications([]),
    markAsRead: (id: string) => {
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
    },
  };
};
