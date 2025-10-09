import { WebSocket } from 'ws';
import { NotificationData } from '../types/common.types';
import logger from '../utils/logger';

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  role: string;
}

class WebSocketService {
  private clients: Map<string, ConnectedClient> = new Map();

  addClient(userId: string, ws: WebSocket, role: string) {
    this.clients.set(userId, { ws, userId, role });
    logger.info(`WebSocket client connected: ${userId} (${role})`);
  }

  removeClient(userId: string) {
    this.clients.delete(userId);
    logger.info(`WebSocket client disconnected: ${userId}`);
  }

  async notifyAdmins(notification: NotificationData) {
    const adminClients = Array.from(this.clients.values()).filter(
      client => client.role === 'Admin'
    );

    const notificationPayload = {
      ...notification,
      timestamp: notification.timestamp || new Date(),
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      targetRole: 'Admin'
    };

    adminClients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify({
            type: 'notification',
            payload: notificationPayload
          }));
        } catch (error) {
          logger.error(`Error sending notification to admin ${client.userId}:`, error);
        }
      }
    });

    logger.info(`Sent notification to ${adminClients.length} admin(s):`, notification.title);
  }

  async notifyUser(userId: string, notification: NotificationData) {
    const client = this.clients.get(userId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        const notificationPayload = {
          ...notification,
          timestamp: notification.timestamp || new Date(),
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId
        };

        client.ws.send(JSON.stringify({
          type: 'notification',
          payload: notificationPayload
        }));
        logger.info(`Sent notification to user ${userId} (${client.role}):`, notification.title);
      } catch (error) {
        logger.error(`Error sending notification to user ${userId}:`, error);
      }
    } else {
      logger.info(`User ${userId} not connected or WebSocket not open`);
    }
  }

  async broadcast(notification: NotificationData, targetRole?: string) {
    const targetClients = targetRole 
      ? Array.from(this.clients.values()).filter(client => client.role === targetRole)
      : Array.from(this.clients.values());

    const notificationPayload = {
      ...notification,
      timestamp: notification.timestamp || new Date(),
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      targetRole: targetRole || 'all'
    };

    targetClients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify({
            type: 'notification',
            payload: notificationPayload
          }));
        } catch (error) {
          logger.error(`Error broadcasting to ${client.userId}:`, error);
        }
      }
    });

    logger.info(`Broadcast notification to ${targetClients.length} client(s) (${targetRole || 'all'}):`, notification.title);
  }

  async notifySupervisors(notification: NotificationData) {
    const supervisorClients = Array.from(this.clients.values()).filter(
      client => client.role === 'Supervisor'
    );

    const notificationPayload = {
      ...notification,
      timestamp: notification.timestamp || new Date(),
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      targetRole: 'Supervisor'
    };

    supervisorClients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify({
            type: 'notification',
            payload: notificationPayload
          }));
        } catch (error) {
          logger.error(`Error sending notification to supervisor ${client.userId}:`, error);
        }
      }
    });

    logger.info(`Sent notification to ${supervisorClients.length} supervisor(s):`, notification.title);
  }

  async notifyStudents(notification: NotificationData) {
    const studentClients = Array.from(this.clients.values()).filter(
      client => client.role === 'Student'
    );

    const notificationPayload = {
      ...notification,
      timestamp: notification.timestamp || new Date(),
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      targetRole: 'Student'
    };

    studentClients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify({
            type: 'notification',
            payload: notificationPayload
          }));
        } catch (error) {
          logger.error(`Error sending notification to student ${client.userId}:`, error);
        }
      }
    });

    logger.info(`Sent notification to ${studentClients.length} student(s):`, notification.title);
  }

  async notifyRoleHierarchy(fromRole: string, toRole: string, notification: NotificationData) {
    // Define role hierarchy notification flows
    const notificationTargets: string[] = [];
    
    if (fromRole === 'Admin') {
      if (toRole === 'Supervisor' || toRole === 'all') {
        notificationTargets.push('Supervisor');
      }
      if (toRole === 'Student' || toRole === 'all') {
        notificationTargets.push('Student');
      }
    } else if (fromRole === 'Supervisor') {
      notificationTargets.push('Admin'); // Always notify admins
      if (toRole === 'Student' || toRole === 'all') {
        notificationTargets.push('Student');
      }
    } else if (fromRole === 'Student') {
      notificationTargets.push('Admin', 'Supervisor'); // Notify both admin and supervisors
    }

    // Send notifications to each target role
    for (const targetRole of notificationTargets) {
      await this.broadcast({
        ...notification,
        targetRole: targetRole as 'Admin' | 'Student' | 'Supervisor' | 'all'
      }, targetRole);
    }
  }

  getConnectedClients() {
    return Array.from(this.clients.values()).map(client => ({
      userId: client.userId,
      role: client.role,
      connected: client.ws.readyState === WebSocket.OPEN
    }));
  }
}

const webSocketService = new WebSocketService();

export const notifyAdmins = (notification: NotificationData) => 
  webSocketService.notifyAdmins(notification);

export const notifySupervisors = (notification: NotificationData) => 
  webSocketService.notifySupervisors(notification);

export const notifyStudents = (notification: NotificationData) => 
  webSocketService.notifyStudents(notification);

export const notifyUser = (userId: string, notification: NotificationData) => 
  webSocketService.notifyUser(userId, notification);

export const broadcast = (notification: NotificationData, targetRole?: string) => 
  webSocketService.broadcast(notification, targetRole);

export const notifyRoleHierarchy = (fromRole: string, toRole: string, notification: NotificationData) => 
  webSocketService.notifyRoleHierarchy(fromRole, toRole, notification);

export default webSocketService;