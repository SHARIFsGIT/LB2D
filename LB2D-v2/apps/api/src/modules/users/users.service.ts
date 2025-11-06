import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EmailService } from '@/common/email/email.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RequestRoleChangeDto } from './dto/request-role-change.dto';
import { ApproveRoleChangeDto } from './dto/approve-role-change.dto';

@Injectable()
export class UsersService {
  // Main admin email that cannot be deleted (from environment variable)
  private readonly MAIN_ADMIN_EMAIL = process.env.MAIN_ADMIN_EMAIL;

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Get user profile
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profilePhoto: true,
        role: true,
        requestedRole: true,
        previousRole: true,
        rejectionReason: true,
        rejectionDate: true,
        isEmailVerified: true,
        isActive: true,
        isBanned: true,
        banReason: true,
        banDate: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { user };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...updateProfileDto,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profilePhoto: true,
        role: true,
        isEmailVerified: true,
      },
    });

    return {
      message: 'Profile updated successfully',
      user: updatedUser,
    };
  }

  /**
   * Request role change
   */
  async requestRoleChange(
    userId: string,
    requestRoleChangeDto: RequestRoleChangeDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has a pending request
    if (user.requestedRole) {
      throw new BadRequestException(
        'You already have a pending role change request',
      );
    }

    // Update user with requested role
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        requestedRole: requestRoleChangeDto.requestedRole,
        previousRole: user.role,
        rejectionReason: null,
        rejectionDate: null,
      },
    });

    // Notify admins of role change request
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { email: true, firstName: true },
    });

    admins.forEach((admin) => {
      this.emailService
        .sendUrgentNotification(
          admin.email,
          admin.firstName,
          'New Role Change Request',
          `${user.firstName} ${user.lastName} (${user.email}) has requested to change their role to ${requestRoleChangeDto.requestedRole}.`,
        )
        .catch((err) => console.error('Failed to send email:', err));
    });

    return {
      message: 'Role change request submitted successfully. Awaiting admin approval.',
    };
  }

  /**
   * Get all users (Admin only)
   */
  async getAllUsers(page: number = 1, limit: number = 20, role?: string) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          profilePhoto: true,
          role: true,
          requestedRole: true,
          previousRole: true,
          rejectionReason: true,
          rejectionDate: true,
          isEmailVerified: true,
          isActive: true,
          isBanned: true,
          banReason: true,
          banDate: true,
          createdAt: true,
          lastLoginAt: true,
          deviceSessions: {
            select: {
              deviceId: true,
              deviceName: true,
              ipAddress: true,
              lastActivityAt: true,
            },
            orderBy: {
              lastActivityAt: 'desc',
            },
            take: 1, // Get only the most recent session
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user by ID (Admin only)
   */
  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profilePhoto: true,
        role: true,
        requestedRole: true,
        previousRole: true,
        rejectionReason: true,
        rejectionDate: true,
        isEmailVerified: true,
        isActive: true,
        isBanned: true,
        banReason: true,
        banDate: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            enrollments: true,
            videoComments: true,
            quizAttempts: true,
            certificates: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { user };
  }

  /**
   * Update user (Admin only)
   */
  async updateUser(userId: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent role change for main admin account
    if (
      this.MAIN_ADMIN_EMAIL &&
      user.email === this.MAIN_ADMIN_EMAIL &&
      updateUserDto.role &&
      updateUserDto.role !== user.role
    ) {
      throw new BadRequestException(
        'Cannot change the role of the main admin account. This account must remain as ADMIN.',
      );
    }

    // Prevent admins from downgrading their own role
    if (
      user.role === 'ADMIN' &&
      updateUserDto.role &&
      updateUserDto.role !== 'ADMIN'
    ) {
      throw new BadRequestException(
        'Admin accounts cannot be downgraded to other roles. Please have another admin make this change.',
      );
    }

    // If updating email, check for conflicts
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email.toLowerCase() },
      });

      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...updateUserDto,
        email: updateUserDto.email?.toLowerCase(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isEmailVerified: true,
        isActive: true,
        isBanned: true,
        banReason: true,
        banDate: true,
      },
    });

    return {
      message: 'User updated successfully',
      user: updatedUser,
    };
  }

  /**
   * Delete user (Admin only)
   */
  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent deletion of main admin account (if configured)
    if (this.MAIN_ADMIN_EMAIL && user.email === this.MAIN_ADMIN_EMAIL) {
      throw new BadRequestException(
        'Cannot delete the main admin account. This account is protected.',
      );
    }

    // Hard delete
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return {
      message: 'User deleted successfully',
    };
  }

  /**
   * Clear all users except main admin (Admin only)
   */
  async clearAllUsers() {
    const mainAdminEmail = this.MAIN_ADMIN_EMAIL;

    const result = await this.prisma.user.deleteMany({
      where: {
        email: {
          not: mainAdminEmail,
        },
      },
    });

    return {
      message: `All users deleted successfully. ${result.count} users removed.`,
      deletedCount: result.count,
    };
  }

  /**
   * Get pending role change requests (Admin only)
   */
  async getPendingRoleChanges() {
    const users = await this.prisma.user.findMany({
      where: {
        requestedRole: {
          not: null,
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        requestedRole: true,
        previousRole: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { users };
  }

  /**
   * Approve or reject role change (Admin only)
   */
  async approveRoleChange(
    userId: string,
    approveRoleChangeDto: ApproveRoleChangeDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.requestedRole) {
      throw new BadRequestException('No pending role change request');
    }

    if (approveRoleChangeDto.approve) {
      // Approve - update role
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          role: user.requestedRole,
          requestedRole: null,
          previousRole: user.role,
          rejectionReason: null,
          rejectionDate: null,
        },
        select: {
          email: true,
          firstName: true,
        },
      });

      // Send approval notification
      this.emailService
        .sendRoleChangeApprovalNotification(
          updatedUser.email,
          updatedUser.firstName,
          user.requestedRole,
        )
        .catch((err) => console.error('Failed to send email:', err));

      return {
        message: `Role change approved. User is now a ${user.requestedRole}.`,
      };
    } else {
      // Reject - reset requested role
      const rejectedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          requestedRole: null,
          rejectionReason: approveRoleChangeDto.rejectionReason,
          rejectionDate: new Date(),
        },
        select: {
          email: true,
          firstName: true,
        },
      });

      // Send rejection notification
      this.emailService
        .sendRoleChangeRejectionNotification(
          rejectedUser.email,
          rejectedUser.firstName,
          user.requestedRole,
          approveRoleChangeDto.rejectionReason || 'Your request does not meet the current requirements.',
        )
        .catch((err) => console.error('Failed to send email:', err));

      return {
        message: 'Role change request rejected.',
      };
    }
  }

  /**
   * Get user statistics (Admin only)
   */
  async getUserStats() {
    const [
      totalUsers,
      adminCount,
      supervisorCount,
      studentCount,
      pendingCount,
      verifiedCount,
      activeCount,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'ADMIN' } }),
      this.prisma.user.count({ where: { role: 'SUPERVISOR' } }),
      this.prisma.user.count({ where: { role: 'STUDENT' } }),
      this.prisma.user.count({ where: { role: 'PENDING' } }),
      this.prisma.user.count({ where: { isEmailVerified: true } }),
      this.prisma.user.count({ where: { isActive: true } }),
    ]);

    return {
      stats: {
        totalUsers,
        byRole: {
          admin: adminCount,
          supervisor: supervisorCount,
          student: studentCount,
          pending: pendingCount,
        },
        verified: verifiedCount,
        active: activeCount,
        inactive: totalUsers - activeCount,
      },
    };
  }
}
