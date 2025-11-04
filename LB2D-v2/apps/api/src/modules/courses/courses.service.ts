import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EmailService } from '@/common/email/email.service';
import { CacheService } from '@/common/cache/cache.service';
import { CacheKeys, CacheTTL, CacheInvalidation } from '@/common/cache/cache.keys';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { EnrollCourseDto } from './dto/enroll-course.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class CoursesService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private cacheService: CacheService,
  ) {}

  /**
   * Create a new course (Supervisor/Admin)
   */
  async create(createCourseDto: CreateCourseDto, supervisorId: string) {
    // Generate slug if not provided
    const slug =
      createCourseDto.slug ||
      this.generateSlug(createCourseDto.title);

    // Check if slug already exists
    const existingCourse = await this.prisma.course.findUnique({
      where: { slug },
    });

    if (existingCourse) {
      throw new BadRequestException('Course with this slug already exists');
    }

    const course = await this.prisma.course.create({
      data: {
        ...createCourseDto,
        slug,
        supervisorId,
        isPublished: false, // Admin must publish
      },
      include: {
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return {
      message: 'Course created successfully',
      course,
    };
  }

  /**
   * Get all courses with filtering and pagination
   * Cached for performance
   */
  async findAll(
    page: number = 1,
    limit: number = 20,
    level?: string,
    search?: string,
    supervisorId?: string,
    publishedOnly: boolean = false,
  ) {
    // Use cache for published courses list (most common query)
    if (publishedOnly && !search && !supervisorId) {
      const cacheKey = CacheKeys.courses.list(page, limit, level);

      return this.cacheService.getOrSet(
        cacheKey,
        async () => this.fetchCourses(page, limit, level, search, supervisorId, publishedOnly),
        CacheTTL.courseList,
      );
    }

    // For filtered queries, bypass cache
    return this.fetchCourses(page, limit, level, search, supervisorId, publishedOnly);
  }

  /**
   * Internal method to fetch courses from database
   */
  private async fetchCourses(
    page: number,
    limit: number,
    level?: string,
    search?: string,
    supervisorId?: string,
    publishedOnly: boolean = false,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (level) {
      where.level = level;
    }

    if (supervisorId) {
      where.supervisorId = supervisorId;
    }

    if (publishedOnly) {
      where.isPublished = true;
      where.isActive = true;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        include: {
          supervisor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              videos: true,
              resources: true,
              quizzes: true,
              enrollments: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      courses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get course by ID
   * Cached for performance
   */
  async findOne(id: string, userId?: string) {
    // Cache course details (without user-specific data)
    const cacheKey = CacheKeys.courses.detail(id);

    const course = await this.cacheService.getOrSet(
      cacheKey,
      async () => this.prisma.course.findUnique({
        where: { id },
        include: {
          supervisor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          videos: {
            where: { status: 'APPROVED' },
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              description: true,
              thumbnailUrl: true,
              duration: true,
              order: true,
            },
          },
          resources: {
            where: { status: 'APPROVED' },
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              description: true,
              fileType: true,
              order: true,
            },
          },
          quizzes: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              description: true,
              duration: true,
              passingScore: true,
              order: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
            },
          },
        },
      }),
      CacheTTL.courseDetail,
    );

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if user is enrolled (if userId provided)
    let enrollment = null;
    if (userId) {
      enrollment = await this.prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: id,
          },
        },
        select: {
          id: true,
          status: true,
          progress: true,
          enrolledAt: true,
          completedAt: true,
        },
      });
    }

    return {
      course,
      enrollment,
    };
  }

  /**
   * Get course by slug
   */
  async findBySlug(slug: string, userId?: string) {
    const course = await this.prisma.course.findUnique({
      where: { slug },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return this.findOne(course.id, userId);
  }

  /**
   * Update course
   */
  async update(
    id: string,
    updateCourseDto: UpdateCourseDto,
    userId: string,
    userRole: string,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check permissions
    if (userRole !== 'ADMIN' && course.supervisorId !== userId) {
      throw new ForbiddenException('You can only update your own courses');
    }

    // If updating slug, check for conflicts
    if (updateCourseDto.slug && updateCourseDto.slug !== course.slug) {
      const existingCourse = await this.prisma.course.findUnique({
        where: { slug: updateCourseDto.slug },
      });

      if (existingCourse) {
        throw new BadRequestException('Course with this slug already exists');
      }
    }

    const updatedCourse = await this.prisma.course.update({
      where: { id },
      data: {
        ...updateCourseDto,
        publishedAt: updateCourseDto.isPublished && !course.isPublished
          ? new Date()
          : course.publishedAt,
      },
      include: {
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Invalidate course caches
    await this.invalidateCourseCaches(id);

    return {
      message: 'Course updated successfully',
      course: updatedCourse,
    };
  }

  /**
   * Delete course
   */
  async remove(id: string, userId: string, userRole: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check permissions
    if (userRole !== 'ADMIN' && course.supervisorId !== userId) {
      throw new ForbiddenException('You can only delete your own courses');
    }

    // Prevent deletion if there are enrollments
    if (course._count.enrollments > 0) {
      throw new BadRequestException(
        'Cannot delete course with active enrollments. Deactivate instead.',
      );
    }

    await this.prisma.course.delete({
      where: { id },
    });

    return {
      message: 'Course deleted successfully',
    };
  }

  /**
   * Enroll in course
   */
  async enroll(enrollCourseDto: EnrollCourseDto, userId: string) {
    const { courseId, paymentIntentId } = enrollCourseDto;

    // Check if course exists
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (!course.isActive || !course.isPublished) {
      throw new BadRequestException('Course is not available for enrollment');
    }

    // Check if already enrolled
    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existingEnrollment) {
      throw new BadRequestException('Already enrolled in this course');
    }

    // For paid courses, verify payment
    if (course.price > 0) {
      if (!paymentIntentId) {
        throw new BadRequestException('Payment required for this course');
      }

      // TODO: Verify payment with Stripe/Payment service
      // const payment = await this.paymentService.verifyPayment(paymentIntentId);
      // if (!payment || payment.status !== 'COMPLETED') {
      //   throw new BadRequestException('Payment not confirmed');
      // }
    }

    // Create enrollment
    const enrollment = await this.prisma.enrollment.create({
      data: {
        userId,
        courseId,
        status: 'ACTIVE',
        progress: 0,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            thumbnailUrl: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Update course enrollment count
    await this.prisma.course.update({
      where: { id: courseId },
      data: {
        totalEnrollments: {
          increment: 1,
        },
      },
    });

    // Create notification
    await this.prisma.notification.create({
      data: {
        userId,
        type: 'COURSE_ENROLLMENT',
        title: 'Course Enrollment Successful',
        message: `You have successfully enrolled in ${enrollment.course.title}`,
        data: { courseId, courseName: enrollment.course.title },
      },
    }).catch(err => console.error('Failed to create notification:', err));

    // Send enrollment confirmation email (async, non-blocking)
    this.emailService.sendEnrollmentConfirmation(
      enrollment.user.email,
      enrollment.user.firstName,
      enrollment.course.title,
      courseId,
    ).catch(err => console.error('Failed to send enrollment email:', err));

    return {
      message: 'Successfully enrolled in course',
      enrollment,
    };
  }

  /**
   * Get user enrollments
   */
  async getMyEnrollments(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
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
    });

    return { enrollments };
  }

  /**
   * Calculate and update course progress
   */
  async updateCourseProgress(userId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    // Get total content items
    const [totalVideos, totalResources, completedVideos, completedResources] =
      await Promise.all([
        this.prisma.video.count({
          where: { courseId, status: 'APPROVED' },
        }),
        this.prisma.courseResource.count({
          where: { courseId, status: 'APPROVED' },
        }),
        this.prisma.videoProgress.count({
          where: {
            userId,
            video: { courseId },
            completed: true,
          },
        }),
        this.prisma.resourceProgress.count({
          where: {
            userId,
            resource: { courseId },
            completed: true,
          },
        }),
      ]);

    const totalItems = totalVideos + totalResources;
    const completedItems = completedVideos + completedResources;

    const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    // Update enrollment progress
    await this.prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        progress,
        status: progress >= 100 ? 'COMPLETED' : 'ACTIVE',
        completedAt: progress >= 100 ? new Date() : null,
      },
    });

    return { progress };
  }

  /**
   * Get course statistics (Supervisor/Admin)
   */
  async getCourseStats(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        _count: {
          select: {
            videos: true,
            resources: true,
            quizzes: true,
            tests: true,
            enrollments: true,
            certificates: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Get enrollment statistics
    const [activeEnrollments, completedEnrollments, averageProgress] =
      await Promise.all([
        this.prisma.enrollment.count({
          where: { courseId, status: 'ACTIVE' },
        }),
        this.prisma.enrollment.count({
          where: { courseId, status: 'COMPLETED' },
        }),
        this.prisma.enrollment.aggregate({
          where: { courseId },
          _avg: { progress: true },
        }),
      ]);

    return {
      stats: {
        totalVideos: course._count.videos,
        totalResources: course._count.resources,
        totalQuizzes: course._count.quizzes,
        totalTests: course._count.tests,
        totalEnrollments: course._count.enrollments,
        activeEnrollments,
        completedEnrollments,
        certificatesIssued: course._count.certificates,
        averageProgress: averageProgress._avg.progress || 0,
        totalRevenue: course.totalRevenue,
      },
    };
  }

  /**
   * Generate URL-friendly slug
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Invalidate course-related caches
   */
  private async invalidateCourseCaches(courseId: string): Promise<void> {
    const patterns = CacheInvalidation.course(courseId);
    await Promise.all(patterns.map(pattern => this.cacheService.delPattern(pattern)));
  }
}
