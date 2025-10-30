import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';

export interface NotificationData {
  id: string;
  type: 'payment' | 'enrollment' | 'course' | 'test' | 'video' | 'video_comment' | 'admin' | 'general' | 'user_registration' | 'role_change' | 'supervisor_action' | 'student_action' | 'document' | 'assessment' | 'certificate' | 'ranking';
  title: string;
  message: string;
  userId?: string;
  targetRole?: 'Admin' | 'Student' | 'Supervisor' | 'all';
  data?: any;
  timestamp: Date;
  read?: boolean;
  urgent?: boolean;
  fromRole?: 'Admin' | 'Student' | 'Supervisor';
  toRole?: 'Admin' | 'Student' | 'Supervisor' | 'all';
}

interface WebSocketHookOptions {
  onNotification?: (notification: NotificationData) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoConnect?: boolean;
}

export const useWebSocket = (options: WebSocketHookOptions = {}) => {
  const { token, user } = useSelector((state: RootState) => state.auth);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;

  const {
    onNotification,
    onConnect,
    onDisconnect,
    onError,
    autoConnect = true
  } = options;

  const connect = () => {
    if (!token || !user) {
      console.warn('WebSocket: No token or user available for connection');
      return;
    }

    // Don't create multiple connections
    if (wsRef.current?.readyState === WebSocket.CONNECTING || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5005';

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setError(null);
        setReconnectAttempts(0);

        // Send authentication
        wsRef.current?.send(JSON.stringify({
          type: 'auth',
          token
        }));

        onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'notification') {
            onNotification?.(data.payload);
          } else if (data.type === 'auth_success') {
          } else if (data.type === 'auth_error') {
            console.error('WebSocket: Authentication failed');
            setError('Authentication failed');
          }
        } catch (error) {
          console.error('WebSocket: Error parsing message', error);
        }
      };

      wsRef.current.onclose = (event) => {
        setIsConnected(false);
        onDisconnect?.();

        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Exponential backoff, max 30s
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket: Error', error);
        setError('Connection error');
        onError?.(error);
      };

    } catch (error) {
      console.error('WebSocket: Failed to create connection', error);
      setError('Failed to create connection');
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    setIsConnected(false);
    setReconnectAttempts(0);
  };

  const sendMessage = (message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket: Cannot send message, not connected');
    }
  };

  // Subscribe to channels
  const subscribe = (channels: string[]) => {
    sendMessage({ type: 'subscribe', channels });
  };

  // Unsubscribe from channels
  const unsubscribe = (channels: string[]) => {
    sendMessage({ type: 'unsubscribe', channels });
  };

  // Mark notification as read
  const markAsRead = (notificationId: string) => {
    sendMessage({ type: 'notification:read', notificationId });
  };

  useEffect(() => {
    if (autoConnect && token && user) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [token, user, autoConnect]);

  return {
    isConnected,
    error,
    connect,
    disconnect,
    sendMessage,
    subscribe,
    unsubscribe,
    markAsRead,
    reconnectAttempts
  };
};

export default useWebSocket;
