import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // FOLLOW/UNFOLLOW
  // ============================================

  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: followingId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already following
    const existing = await this.prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Already following this user');
    }

    const follow = await this.prisma.userFollow.create({
      data: {
        followerId,
        followingId,
      },
      include: {
        following: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            role: true,
          },
        },
      },
    });

    return { success: true, data: follow, message: 'Now following user' };
  }

  async unfollow(followerId: string, followingId: string) {
    const follow = await this.prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (!follow) {
      throw new NotFoundException('Not following this user');
    }

    await this.prisma.userFollow.delete({ where: { id: follow.id } });

    return { success: true, message: 'Unfollowed user' };
  }

  async getFollowers(userId: string) {
    const followers = await this.prisma.userFollow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: followers.map(f => f.follower),
      meta: { total: followers.length },
    };
  }

  async getFollowing(userId: string) {
    const following = await this.prisma.userFollow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: following.map(f => f.following),
      meta: { total: following.length },
    };
  }

  async getFollowStats(userId: string) {
    const [followersCount, followingCount] = await Promise.all([
      this.prisma.userFollow.count({ where: { followingId: userId } }),
      this.prisma.userFollow.count({ where: { followerId: userId } }),
    ]);

    return {
      success: true,
      data: {
        followers: followersCount,
        following: followingCount,
      },
    };
  }

  async isFollowing(followerId: string, followingId: string) {
    const follow = await this.prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    return {
      success: true,
      data: { isFollowing: !!follow },
    };
  }

  // ============================================
  // ACTIVITY FEED
  // ============================================

  async getActivityFeed(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    // Get users that current user is following
    const following = await this.prisma.userFollow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = following.map(f => f.followingId);
    followingIds.push(userId); // Include own activity

    const [activities, total] = await Promise.all([
      this.prisma.activityFeed.findMany({
        where: {
          userId: { in: followingIds },
          isPublic: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
            },
          },
        },
      }),
      this.prisma.activityFeed.count({
        where: {
          userId: { in: followingIds },
          isPublic: true,
        },
      }),
    ]);

    return {
      success: true,
      data: activities,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMyActivity(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      this.prisma.activityFeed.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.activityFeed.count({ where: { userId } }),
    ]);

    return {
      success: true,
      data: activities,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createActivity(
    userId: string,
    activityType: string,
    entityType: string,
    entityId: string,
    metadata?: any,
    isPublic = true,
  ) {
    const activity = await this.prisma.activityFeed.create({
      data: {
        userId,
        activityType: activityType as any,
        entityType,
        entityId,
        metadata,
        isPublic,
      },
    });

    return { success: true, data: activity };
  }

  // ============================================
  // PUBLIC PROFILE
  // ============================================

  async getPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profilePhoto: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get stats
    const [enrollments, reviews, topicsCount, followStats] = await Promise.all([
      this.prisma.enrollment.count({ where: { userId, status: 'COMPLETED' } }),
      this.prisma.courseReview.count({ where: { userId, status: 'APPROVED' } }),
      this.prisma.discussionTopic.count({ where: { userId } }),
      this.getFollowStats(userId),
    ]);

    return {
      success: true,
      data: {
        user,
        stats: {
          coursesCompleted: enrollments,
          reviewsWritten: reviews,
          topicsCreated: topicsCount,
          followers: followStats.data.followers,
          following: followStats.data.following,
        },
      },
    };
  }
}
