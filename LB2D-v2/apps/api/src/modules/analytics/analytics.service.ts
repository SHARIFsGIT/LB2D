import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get admin dashboard statistics
   */
  async getAdminDashboard() {
    const [
      totalUsers,
      totalCourses,
      totalEnrollments,
      totalRevenue,
      recentUsers,
      popularCourses,
      recentEnrollments,
    ] = await Promise.all([
      // Total users by role
      this.prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      // Total courses
      this.prisma.course.count({
        where: { isPublished: true },
      }),
      // Total enrollments
      this.prisma.enrollment.count(),
      // Total revenue
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      // Recent users (last 7 days)
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      // Most popular courses
      this.prisma.course.findMany({
        where: { isPublished: true },
        select: {
          id: true,
          title: true,
          totalEnrollments: true,
          totalRevenue: true,
        },
        orderBy: {
          totalEnrollments: 'desc',
        },
        take: 5,
      }),
      // Recent enrollments
      this.prisma.enrollment.findMany({
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          course: {
            select: {
              title: true,
            },
          },
        },
        orderBy: {
          enrolledAt: 'desc',
        },
        take: 10,
      }),
    ]);

    const usersByRole = totalUsers.reduce((acc, item) => {
      acc[item.role.toLowerCase()] = item._count;
      return acc;
    }, {} as Record<string, number>);

    return {
      overview: {
        totalUsers: Object.values(usersByRole).reduce((a, b) => a + b, 0),
        usersByRole,
        totalCourses,
        totalEnrollments,
        totalRevenue: totalRevenue._sum.amount || 0,
        recentUsers, // Last 7 days
      },
      popularCourses,
      recentEnrollments,
    };
  }

  /**
   * Get supervisor dashboard statistics
   */
  async getSupervisorDashboard(supervisorId: string) {
    const [myCourses, totalStudents, totalRevenue, recentEnrollments] =
      await Promise.all([
        // Supervisor's courses
        this.prisma.course.findMany({
          where: { supervisorId },
          select: {
            id: true,
            title: true,
            totalEnrollments: true,
            totalRevenue: true,
            _count: {
              select: {
                videos: true,
                resources: true,
                quizzes: true,
              },
            },
          },
        }),
        // Total students across all courses
        this.prisma.enrollment.count({
          where: {
            course: {
              supervisorId,
            },
          },
        }),
        // Total revenue
        this.prisma.course.aggregate({
          where: { supervisorId },
          _sum: { totalRevenue: true },
        }),
        // Recent enrollments
        this.prisma.enrollment.findMany({
          where: {
            course: {
              supervisorId,
            },
          },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            course: {
              select: {
                title: true,
              },
            },
          },
          orderBy: {
            enrolledAt: 'desc',
          },
          take: 10,
        }),
      ]);

    return {
      overview: {
        totalCourses: myCourses.length,
        totalStudents,
        totalRevenue: totalRevenue._sum.totalRevenue || 0,
      },
      myCourses,
      recentEnrollments,
    };
  }

  /**
   * Get student dashboard statistics
   */
  async getStudentDashboard(userId: string) {
    const [enrollments, certificates, quizAttempts] = await Promise.all([
      // Enrolled courses with progress
      this.prisma.enrollment.findMany({
        where: { userId },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              thumbnailUrl: true,
              level: true,
              _count: {
                select: {
                  videos: true,
                  quizzes: true,
                },
              },
            },
          },
        },
        orderBy: {
          enrolledAt: 'desc',
        },
      }),
      // Certificates earned
      this.prisma.certificate.count({
        where: { userId },
      }),
      // Quiz performance
      this.prisma.quizAttempt.findMany({
        where: { userId },
        include: {
          quiz: {
            select: {
              title: true,
              passingScore: true,
            },
          },
        },
        orderBy: {
          completedAt: 'desc',
        },
        take: 10,
      }),
    ]);

    const activeEnrollments = enrollments.filter((e) => e.status === 'ACTIVE').length;
    const completedEnrollments = enrollments.filter((e) => e.status === 'COMPLETED').length;
    const averageProgress =
      enrollments.length > 0
        ? enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length
        : 0;

    return {
      overview: {
        totalEnrollments: enrollments.length,
        activeEnrollments,
        completedEnrollments,
        certificatesEarned: certificates,
        averageProgress,
      },
      enrollments,
      recentQuizAttempts: quizAttempts,
    };
  }
}
