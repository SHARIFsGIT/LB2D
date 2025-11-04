import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EmailService } from '@/common/email/email.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Create notification
   */
  async create(createNotificationDto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: createNotificationDto.userId,
        type: createNotificationDto.type,
        title: createNotificationDto.title,
        message: createNotificationDto.message,
        data: createNotificationDto.data
          ? JSON.stringify(createNotificationDto.data)
          : null,
        urgent: createNotificationDto.urgent || false,
      },
    });

    // Send email if urgent notification
    if (createNotificationDto.urgent) {
      const user = await this.prisma.user.findUnique({
        where: { id: createNotificationDto.userId },
        select: { email: true, firstName: true },
      });

      if (user) {
        this.emailService
          .sendUrgentNotification(
            user.email,
            user.firstName,
            createNotificationDto.title,
            createNotificationDto.message,
          )
          .catch((err) => console.error('Failed to send email:', err));
      }
    }

    return {
      message: 'Notification created successfully',
      notification,
    };
  }

  /**
   * Get user's notifications
   */
  async getMyNotifications(userId: string, unreadOnly: boolean = false) {
    const where: any = { userId };

    if (unreadOnly) {
      where.read = false;
    }

    const notifications = await this.prisma.notification.findMany({
      where,
      orderBy: [
        { urgent: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 50, // Limit to last 50
    });

    const unreadCount = await this.prisma.notification.count({
      where: { userId, read: false },
    });

    return {
      notifications,
      unreadCount,
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.update({
      where: { id },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return {
      message: 'Notification marked as read',
    };
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return {
      message: 'All notifications marked as read',
    };
  }

  /**
   * Clear all notifications
   */
  async clearAll(userId: string) {
    await this.prisma.notification.deleteMany({
      where: { userId },
    });

    return {
      message: 'All notifications cleared',
    };
  }

  /**
   * Send notification to user (helper method)
   */
  async notify(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: any,
  ) {
    return this.create({
      userId,
      type,
      title,
      message,
      data,
    });
  }

  /**
   * Send notification to all users (Admin broadcast)
   */
  async notifyAll(title: string, message: string, type: NotificationType = 'ADMIN_ANNOUNCEMENT') {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    const notifications = await this.prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        type,
        title,
        message,
      })),
    });

    return {
      message: `Notification sent to ${notifications.count} users`,
    };
  }
}
