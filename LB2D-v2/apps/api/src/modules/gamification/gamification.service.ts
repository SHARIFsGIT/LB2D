import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { LogActivityDto } from './dto/log-activity.dto';

@Injectable()
export class GamificationService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // ACHIEVEMENTS
  // ============================================

  async createAchievement(dto: CreateAchievementDto) {
    const achievement = await this.prisma.achievement.create({
      data: {
        ...dto,
        isActive: dto.isActive !== false,
        order: 0,
      },
    });

    return { success: true, data: achievement };
  }

  async findAllAchievements() {
    const achievements = await this.prisma.achievement.findMany({
      where: { isActive: true },
      orderBy: [{ rarity: 'desc' }, { points: 'desc' }],
    });

    return { success: true, data: achievements };
  }

  async getMyAchievements(userId: string) {
    // Ensure user has points record
    await this.ensureUserPoints(userId);

    const [userAchievements, allAchievements] = await Promise.all([
      this.prisma.userAchievement.findMany({
        where: { userId },
        include: {
          achievement: true,
        },
        orderBy: { completedAt: 'desc' },
      }),
      this.prisma.achievement.findMany({
        where: { isActive: true },
      }),
    ]);

    // Initialize achievements for user if not exists
    for (const achievement of allAchievements) {
      const exists = userAchievements.find(ua => ua.achievementId === achievement.id);
      if (!exists) {
        await this.prisma.userAchievement.create({
          data: {
            userId,
            achievementId: achievement.id,
            progress: 0,
            isCompleted: false,
            pointsEarned: 0,
          },
        });
      }
    }

    // Refresh list
    const updated = await this.prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true,
      },
      orderBy: [{ isCompleted: 'desc' }, { progress: 'desc' }],
    });

    const completed = updated.filter(a => a.isCompleted).length;
    const total = updated.length;
    const totalPoints = updated.reduce((sum, a) => sum + a.pointsEarned, 0);

    return {
      success: true,
      data: {
        achievements: updated,
        summary: {
          completed,
          total,
          totalPoints,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        },
      },
    };
  }

  // ============================================
  // POINTS & LEVELS
  // ============================================

  async getMyPoints(userId: string) {
    const userPoints = await this.ensureUserPoints(userId);

    return { success: true, data: userPoints };
  }

  async logActivity(userId: string, dto: LogActivityDto) {
    // Award points based on activity
    const pointsMap = {
      VIDEO_WATCHED: 5,
      QUIZ_PASSED: 20,
      COURSE_COMPLETED: 100,
      DISCUSSION_POSTED: 10,
      REVIEW_POSTED: 15,
    };

    const points = pointsMap[dto.activityType] || 5;

    await this.addPoints(userId, points);
    await this.checkAchievements(userId, dto.activityType);
    await this.updateStreak(userId);

    return { success: true, message: `Earned ${points} points!`, data: { points } };
  }

  private async addPoints(userId: string, points: number) {
    const userPoints = await this.ensureUserPoints(userId);

    const newTotalPoints = userPoints.totalPoints + points;
    const newLevel = Math.floor(newTotalPoints / 100) + 1;
    const pointsToNextLevel = (newLevel * 100) - newTotalPoints;

    await this.prisma.userPoints.update({
      where: { userId },
      data: {
        totalPoints: newTotalPoints,
        currentLevel: newLevel,
        pointsToNextLevel,
      },
    });

    // Update leaderboards
    await this.updateLeaderboards(userId, newTotalPoints);
  }

  private async ensureUserPoints(userId: string) {
    let userPoints = await this.prisma.userPoints.findUnique({
      where: { userId },
    });

    if (!userPoints) {
      userPoints = await this.prisma.userPoints.create({
        data: {
          userId,
          totalPoints: 0,
          currentLevel: 1,
          pointsToNextLevel: 100,
          currentStreak: 0,
          longestStreak: 0,
        },
      });
    }

    return userPoints;
  }

  private async updateStreak(userId: string) {
    const userPoints = await this.prisma.userPoints.findUnique({
      where: { userId },
    });

    if (!userPoints) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActivity = userPoints.lastActivityDate;

    if (!lastActivity) {
      // First activity
      await this.prisma.userPoints.update({
        where: { userId },
        data: {
          currentStreak: 1,
          longestStreak: 1,
          lastActivityDate: today,
        },
      });
    } else {
      const lastActivityDay = new Date(lastActivity);
      lastActivityDay.setHours(0, 0, 0, 0);

      const dayDiff = Math.floor((today.getTime() - lastActivityDay.getTime()) / (1000 * 60 * 60 * 24));

      if (dayDiff === 1) {
        // Consecutive day
        const newStreak = userPoints.currentStreak + 1;
        await this.prisma.userPoints.update({
          where: { userId },
          data: {
            currentStreak: newStreak,
            longestStreak: Math.max(newStreak, userPoints.longestStreak),
            lastActivityDate: today,
          },
        });
      } else if (dayDiff > 1) {
        // Streak broken
        await this.prisma.userPoints.update({
          where: { userId },
          data: {
            currentStreak: 1,
            lastActivityDate: today,
          },
        });
      }
      // If dayDiff === 0, same day, don't update streak
    }
  }

  private async checkAchievements(userId: string, activityType: string) {
    // Map activity types to achievement types
    const typeMap: any = {
      VIDEO_WATCHED: 'VIDEOS_WATCHED',
      QUIZ_PASSED: 'QUIZZES_PASSED',
      COURSE_COMPLETED: 'COURSES_COMPLETED',
      DISCUSSION_POSTED: 'DISCUSSIONS_POSTED',
      REVIEW_POSTED: 'COURSE_REVIEWS',
    };

    const achievementType = typeMap[activityType];
    if (!achievementType) return;

    // Get relevant achievements
    const achievements = await this.prisma.achievement.findMany({
      where: { type: achievementType, isActive: true },
    });

    for (const achievement of achievements) {
      const userAchievement = await this.prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: {
            userId,
            achievementId: achievement.id,
          },
        },
      });

      if (userAchievement && !userAchievement.isCompleted) {
        const newProgress = userAchievement.progress + 1;

        if (newProgress >= achievement.requirement) {
          // Achievement unlocked!
          await this.prisma.userAchievement.update({
            where: { id: userAchievement.id },
            data: {
              progress: newProgress,
              isCompleted: true,
              completedAt: new Date(),
              pointsEarned: achievement.points,
            },
          });

          // Award points
          await this.addPoints(userId, achievement.points);
        } else {
          // Update progress
          await this.prisma.userAchievement.update({
            where: { id: userAchievement.id },
            data: { progress: newProgress },
          });
        }
      }
    }
  }

  // ============================================
  // LEADERBOARDS
  // ============================================

  async getLeaderboard(period: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const periodKey = this.getCurrentPeriodKey(period);

    const [leaders, total] = await Promise.all([
      this.prisma.leaderboard.findMany({
        where: { period: period as any, periodKey },
        skip,
        take: limit,
        orderBy: { rank: 'asc' },
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
      this.prisma.leaderboard.count({
        where: { period: period as any, periodKey },
      }),
    ]);

    return {
      success: true,
      data: leaders,
      meta: {
        total,
        page,
        limit,
        period,
        periodKey,
      },
    };
  }

  async getMyRank(userId: string, period: string) {
    const periodKey = this.getCurrentPeriodKey(period);

    const myEntry = await this.prisma.leaderboard.findUnique({
      where: {
        userId_period_periodKey: {
          userId,
          period: period as any,
          periodKey,
        },
      },
    });

    return {
      success: true,
      data: myEntry || { rank: null, points: 0, message: 'Not ranked yet' },
    };
  }

  private async updateLeaderboards(userId: string, totalPoints: number) {
    const periods = ['ALL_TIME', 'MONTHLY', 'WEEKLY'];

    for (const period of periods) {
      const periodKey = this.getCurrentPeriodKey(period);

      await this.prisma.leaderboard.upsert({
        where: {
          userId_period_periodKey: {
            userId,
            period: period as any,
            periodKey,
          },
        },
        update: {
          points: totalPoints,
        },
        create: {
          userId,
          period: period as any,
          periodKey,
          points: totalPoints,
          rank: 0, // Will be calculated
        },
      });
    }

    // Recalculate ranks for all periods
    for (const period of periods) {
      await this.recalculateRanks(period);
    }
  }

  private async recalculateRanks(period: string) {
    const periodKey = this.getCurrentPeriodKey(period);

    const entries = await this.prisma.leaderboard.findMany({
      where: { period: period as any, periodKey },
      orderBy: { points: 'desc' },
    });

    for (let i = 0; i < entries.length; i++) {
      await this.prisma.leaderboard.update({
        where: { id: entries[i].id },
        data: { rank: i + 1 },
      });
    }
  }

  private getCurrentPeriodKey(period: string): string {
    const now = new Date();

    if (period === 'ALL_TIME') {
      return 'all-time';
    } else if (period === 'MONTHLY') {
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    } else if (period === 'WEEKLY') {
      const week = this.getWeekNumber(now);
      return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
    }

    return 'all-time';
  }

  private getWeekNumber(date: Date): number {
    const firstDay = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - firstDay.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + firstDay.getDay() + 1) / 7);
  }

  // ============================================
  // STREAK
  // ============================================

  async getStreak(userId: string) {
    const userPoints = await this.ensureUserPoints(userId);

    return {
      success: true,
      data: {
        currentStreak: userPoints.currentStreak,
        longestStreak: userPoints.longestStreak,
        lastActivityDate: userPoints.lastActivityDate,
      },
    };
  }
}
