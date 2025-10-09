import Notification from '../models/Notification.model';
import User from '../models/User.model';
import { NotificationData } from '../types/common.types';
import logger from '../utils/logger';
import webSocketService from './websocket.service';

class NotificationService {
  /**
   * Create and save a notification to database, then send via WebSocket
   */
  async createNotification(
    userId: string,
    notification: Omit<NotificationData, 'id' | 'timestamp'>
  ) {
    try {
      // Create notification in database
      const newNotification = await Notification.create({
        userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        read: false,
        urgent: notification.urgent || false,
        targetRole: notification.targetRole,
        fromRole: notification.fromRole,
        fromUserId: notification.data?.fromUserId,
        data: notification.data,
        actionUrl: notification.data?.actionUrl
      });

      // Send real-time notification via WebSocket
      const wsNotification: NotificationData = {
        id: newNotification._id.toString(),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        userId,
        targetRole: notification.targetRole,
        data: notification.data,
        timestamp: newNotification.createdAt,
        read: false,
        urgent: notification.urgent,
        fromRole: notification.fromRole,
        toRole: notification.targetRole
      };

      await webSocketService.notifyUser(userId, wsNotification);

      logger.info(`Notification created and sent to user ${userId}: ${notification.title}`);
      return newNotification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create notifications for multiple users
   */
  async createBulkNotifications(
    userIds: string[],
    notification: Omit<NotificationData, 'id' | 'timestamp' | 'userId'>
  ) {
    try {
      const notifications = userIds.map(userId => ({
        userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        read: false,
        urgent: notification.urgent || false,
        targetRole: notification.targetRole,
        fromRole: notification.fromRole,
        fromUserId: notification.data?.fromUserId,
        data: notification.data,
        actionUrl: notification.data?.actionUrl
      }));

      // Bulk insert to database
      const createdNotifications = await Notification.insertMany(notifications);

      // Send real-time notifications via WebSocket
      for (const notif of createdNotifications) {
        const wsNotification: NotificationData = {
          id: notif._id.toString(),
          type: notif.type,
          title: notif.title,
          message: notif.message,
          userId: notif.userId.toString(),
          targetRole: notif.targetRole,
          data: notif.data,
          timestamp: notif.createdAt,
          read: false,
          urgent: notif.urgent,
          fromRole: notif.fromRole,
          toRole: notif.targetRole
        };

        await webSocketService.notifyUser(notif.userId.toString(), wsNotification);
      }

      logger.info(`${createdNotifications.length} notifications created and sent`);
      return createdNotifications;
    } catch (error) {
      logger.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Notify all users of a specific role
   */
  async notifyRole(
    role: 'Admin' | 'Student' | 'Supervisor',
    notification: Omit<NotificationData, 'id' | 'timestamp' | 'userId'>
  ) {
    try {
      // Get all users with the specified role
      const users = await User.find({ role, isActive: true }).select('_id');
      const userIds = users.map(u => u._id.toString());

      if (userIds.length === 0) {
        logger.info(`No active users found with role: ${role}`);
        return [];
      }

      return await this.createBulkNotifications(userIds, {
        ...notification,
        targetRole: role
      });
    } catch (error) {
      logger.error(`Error notifying role ${role}:`, error);
      throw error;
    }
  }

  /**
   * Get user's notifications with pagination
   */
  async getUserNotifications(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
    } = {}
  ) {
    try {
      const { page = 1, limit = 20, unreadOnly = false } = options;
      const skip = (page - 1) * limit;

      const query: any = { userId };
      if (unreadOnly) {
        query.read = false;
      }

      const [notifications, total] = await Promise.all([
        Notification.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Notification.countDocuments(query)
      ]);

      return {
        notifications,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { read: true },
        { new: true }
      );

      if (!notification) {
        throw new Error('Notification not found');
      }

      logger.info(`Notification ${notificationId} marked as read by user ${userId}`);
      return notification;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all user notifications as read
   */
  async markAllAsRead(userId: string) {
    try {
      const result = await Notification.updateMany(
        { userId, read: false },
        { read: true }
      );

      logger.info(`Marked ${result.modifiedCount} notifications as read for user ${userId}`);
      return result.modifiedCount;
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string) {
    try {
      const count = await Notification.countDocuments({
        userId,
        read: false
      });

      return count;
    } catch (error) {
      logger.error('Error getting unread count:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string) {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        userId
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      logger.info(`Notification ${notificationId} deleted by user ${userId}`);
      return notification;
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Delete all read notifications for a user
   */
  async deleteReadNotifications(userId: string) {
    try {
      const result = await Notification.deleteMany({
        userId,
        read: true
      });

      logger.info(`Deleted ${result.deletedCount} read notifications for user ${userId}`);
      return result.deletedCount;
    } catch (error) {
      logger.error('Error deleting read notifications:', error);
      throw error;
    }
  }
}

export default new NotificationService();
