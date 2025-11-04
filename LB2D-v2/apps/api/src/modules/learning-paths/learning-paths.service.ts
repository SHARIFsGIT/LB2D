import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreatePathDto } from './dto/create-path.dto';
import { AddStepDto } from './dto/add-step.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';

@Injectable()
export class LearningPathsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new learning path
   */
  async create(createdBy: string, dto: CreatePathDto) {
    const slug = dto.slug || this.generateSlug(dto.title);

    // Check if slug exists
    const existing = await this.prisma.learningPath.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new BadRequestException('Learning path with this slug already exists');
    }

    const path = await this.prisma.learningPath.create({
      data: {
        title: dto.title,
        description: dto.description,
        slug,
        thumbnailUrl: dto.thumbnailUrl,
        level: dto.level,
        estimatedHours: dto.estimatedHours,
        isOfficial: dto.isOfficial || false,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        tags: dto.tags || [],
        createdBy,
        isPublished: false, // Admin must publish
      },
    });

    return {
      success: true,
      data: path,
      message: 'Learning path created successfully',
    };
  }

  /**
   * Find all learning paths
   */
  async findAll(page = 1, limit = 10, level?: string, isOfficial?: boolean) {
    const skip = (page - 1) * limit;

    const where: any = { isPublished: true };
    if (level) where.level = level;
    if (isOfficial !== undefined) where.isOfficial = isOfficial;

    const [paths, total] = await Promise.all([
      this.prisma.learningPath.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isOfficial: 'desc' }, { enrollmentCount: 'desc' }],
        include: {
          _count: {
            select: { steps: true, enrollments: true },
          },
        },
      }),
      this.prisma.learningPath.count({ where }),
    ]);

    return {
      success: true,
      data: paths,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find one path by slug
   */
  async findOne(slug: string) {
    const path = await this.prisma.learningPath.findUnique({
      where: { slug },
      include: {
        steps: {
          orderBy: { order: 'asc' },
          include: {
            course: {
              select: {
                id: true,
                title: true,
                description: true,
                thumbnailUrl: true,
                level: true,
                price: true,
                discountPrice: true,
                averageRating: true,
                totalRatings: true,
              },
            },
          },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });

    if (!path) {
      throw new NotFoundException('Learning path not found');
    }

    return { success: true, data: path };
  }

  /**
   * Add a course step to the path
   */
  async addStep(pathId: string, dto: AddStepDto) {
    // Verify path exists
    const path = await this.prisma.learningPath.findUnique({
      where: { id: pathId },
    });

    if (!path) {
      throw new NotFoundException('Learning path not found');
    }

    // Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if course already in path
    const existing = await this.prisma.learningPathStep.findUnique({
      where: {
        pathId_courseId: {
          pathId,
          courseId: dto.courseId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Course already in this path');
    }

    const step = await this.prisma.learningPathStep.create({
      data: {
        pathId,
        courseId: dto.courseId,
        order: dto.order,
        isOptional: dto.isOptional || false,
        description: dto.description,
        estimatedHours: dto.estimatedHours,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
          },
        },
      },
    });

    return { success: true, data: step, message: 'Step added to path' };
  }

  /**
   * Remove a step from the path
   */
  async removeStep(stepId: string) {
    const step = await this.prisma.learningPathStep.findUnique({
      where: { id: stepId },
    });

    if (!step) {
      throw new NotFoundException('Step not found');
    }

    await this.prisma.learningPathStep.delete({ where: { id: stepId } });

    return { success: true, message: 'Step removed from path' };
  }

  /**
   * Enroll in a learning path
   */
  async enroll(userId: string, pathId: string) {
    // Verify path exists
    const path = await this.prisma.learningPath.findUnique({
      where: { id: pathId },
    });

    if (!path) {
      throw new NotFoundException('Learning path not found');
    }

    if (!path.isPublished) {
      throw new BadRequestException('This path is not published yet');
    }

    // Check if already enrolled
    const existing = await this.prisma.pathEnrollment.findUnique({
      where: {
        pathId_userId: {
          pathId,
          userId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Already enrolled in this path');
    }

    const enrollment = await this.prisma.pathEnrollment.create({
      data: {
        pathId,
        userId,
        status: 'ACTIVE',
        progress: 0,
        currentStepIndex: 0,
      },
      include: {
        path: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    // Update path enrollment count
    await this.prisma.learningPath.update({
      where: { id: pathId },
      data: { enrollmentCount: { increment: 1 } },
    });

    return {
      success: true,
      data: enrollment,
      message: 'Enrolled in learning path successfully',
    };
  }

  /**
   * Get user's enrolled paths
   */
  async getMyPaths(userId: string) {
    const enrollments = await this.prisma.pathEnrollment.findMany({
      where: { userId },
      include: {
        path: {
          include: {
            _count: {
              select: { steps: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: enrollments };
  }

  /**
   * Update progress in a path
   */
  async updateProgress(enrollmentId: string, userId: string, dto: UpdateProgressDto) {
    const enrollment = await this.prisma.pathEnrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    if (enrollment.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    const updated = await this.prisma.pathEnrollment.update({
      where: { id: enrollmentId },
      data: {
        currentStepIndex: dto.currentStepIndex,
        progress: dto.progress,
        completedAt: dto.progress >= 100 ? new Date() : undefined,
        status: dto.progress >= 100 ? 'COMPLETED' : 'ACTIVE',
      },
    });

    // If completed, update path completion count
    if (dto.progress >= 100 && !enrollment.completedAt) {
      await this.prisma.learningPath.update({
        where: { id: enrollment.pathId },
        data: { completionCount: { increment: 1 } },
      });
    }

    return { success: true, data: updated };
  }

  /**
   * Get path statistics
   */
  async getStats(pathId: string) {
    const path = await this.prisma.learningPath.findUnique({
      where: { id: pathId },
      include: {
        _count: {
          select: { steps: true, enrollments: true },
        },
      },
    });

    if (!path) {
      throw new NotFoundException('Learning path not found');
    }

    const completedEnrollments = await this.prisma.pathEnrollment.count({
      where: {
        pathId,
        status: 'COMPLETED',
      },
    });

    const completionRate = path.enrollmentCount > 0
      ? (completedEnrollments / path.enrollmentCount) * 100
      : 0;

    return {
      success: true,
      data: {
        totalSteps: path._count.steps,
        totalEnrollments: path.enrollmentCount,
        completedEnrollments,
        completionRate: Math.round(completionRate * 10) / 10,
      },
    };
  }

  /**
   * Publish path (Admin/Creator)
   */
  async publish(pathId: string) {
    const path = await this.prisma.learningPath.update({
      where: { id: pathId },
      data: { isPublished: true },
    });

    return { success: true, data: path };
  }

  /**
   * Delete path
   */
  async remove(pathId: string, userId: string, isAdmin = false) {
    const path = await this.prisma.learningPath.findUnique({
      where: { id: pathId },
    });

    if (!path) {
      throw new NotFoundException('Learning path not found');
    }

    if (!isAdmin && path.createdBy !== userId) {
      throw new ForbiddenException('You can only delete your own paths');
    }

    await this.prisma.learningPath.delete({ where: { id: pathId } });

    return { success: true, message: 'Learning path deleted' };
  }

  // ============================================
  // HELPERS
  // ============================================

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);
  }
}
