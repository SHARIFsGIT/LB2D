import { Request, Response } from 'express';
import notificationService from '../services/notification.service';
import { ResponseUtil } from '../utils/response.util';
import logger from '../utils/logger';

/**
 * Get user's notifications
 */
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';

    const result = await notificationService.getUserNotifications(userId, {
      page,
      limit,
      unreadOnly
    });

    ResponseUtil.success(res, 'Notifications retrieved successfully', result);
  } catch (error: any) {
    logger.error('Error getting notifications:', error);
    ResponseUtil.error(res, 'Failed to get notifications', 500, error.message);
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const count = await notificationService.getUnreadCount(userId);

    ResponseUtil.success(res, 'Unread count retrieved successfully', { count });
  } catch (error: any) {
    logger.error('Error getting unread count:', error);
    ResponseUtil.error(res, 'Failed to get unread count', 500, error.message);
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { notificationId } = req.params;

    const notification = await notificationService.markAsRead(notificationId, userId);

    ResponseUtil.success(res, 'Notification marked as read', notification);
  } catch (error: any) {
    logger.error('Error marking notification as read:', error);

    if (error.message === 'Notification not found') {
      return ResponseUtil.notFound(res, error.message);
    }

    ResponseUtil.error(res, 'Failed to mark notification as read', 500, error.message);
  }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const count = await notificationService.markAllAsRead(userId);

    ResponseUtil.success(res, `${count} notifications marked as read`);
  } catch (error: any) {
    logger.error('Error marking all notifications as read:', error);
    ResponseUtil.error(res, 'Failed to mark all notifications as read', 500, error.message);
  }
};

/**
 * Delete notification
 */
export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { notificationId } = req.params;

    await notificationService.deleteNotification(notificationId, userId);

    ResponseUtil.success(res, 'Notification deleted successfully');
  } catch (error: any) {
    logger.error('Error deleting notification:', error);

    if (error.message === 'Notification not found') {
      return ResponseUtil.notFound(res, error.message);
    }

    ResponseUtil.error(res, 'Failed to delete notification', 500, error.message);
  }
};

/**
 * Delete all read notifications
 */
export const deleteReadNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const count = await notificationService.deleteReadNotifications(userId);

    ResponseUtil.success(res, `${count} read notifications deleted`);
  } catch (error: any) {
    logger.error('Error deleting read notifications:', error);
    ResponseUtil.error(res, 'Failed to delete read notifications', 500, error.message);
  }
};

/**
 * Create test notification (development only)
 */
export const createTestNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return ResponseUtil.forbidden(res, 'Only available in development mode');
    }

    const userId = req.userId!;
    const { title, message, type, urgent } = req.body;

    const notification = await notificationService.createNotification(userId, {
      type: type || 'general',
      title: title || 'Test Notification',
      message: message || 'This is a test notification',
      urgent: urgent || false
    });

    ResponseUtil.success(res, 'Test notification created', notification);
  } catch (error: any) {
    logger.error('Error creating test notification:', error);
    ResponseUtil.error(res, 'Failed to create test notification', 500, error.message);
  }
};
