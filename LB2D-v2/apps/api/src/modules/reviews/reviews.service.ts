import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new review
   */
  async create(userId: string, dto: CreateReviewDto) {
    // Check if course exists
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if user already reviewed this course
    const existingReview = await this.prisma.courseReview.findUnique({
      where: {
        courseId_userId: {
          courseId: dto.courseId,
          userId: userId,
        },
      },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this course');
    }

    // Check if user completed the course (for verification badge)
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: userId,
          courseId: dto.courseId,
        },
      },
    });

    const isVerified = enrollment?.status === 'COMPLETED';

    // Create review
    const review = await this.prisma.courseReview.create({
      data: {
        courseId: dto.courseId,
        userId: userId,
        rating: dto.rating,
        title: dto.title,
        content: dto.content,
        isVerified,
        status: 'PENDING', // Requires moderation
      },
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
    });

    // Update course statistics
    await this.updateCourseStats(dto.courseId);

    return {
      success: true,
      data: review,
      message: 'Review submitted successfully. It will be visible after moderation.',
    };
  }

  /**
   * Find all reviews with pagination and filters
   */
  async findAll(courseId?: string, page = 1, limit = 10, status?: string) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (courseId) where.courseId = courseId;
    if (status) where.status = status;
    else where.status = 'APPROVED'; // Only show approved by default

    const [reviews, total] = await Promise.all([
      this.prisma.courseReview.findMany({
        where,
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
          course: {
            select: {
              id: true,
              title: true,
              thumbnailUrl: true,
            },
          },
        },
      }),
      this.prisma.courseReview.count({ where }),
    ]);

    return {
      success: true,
      data: reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find one review by ID
   */
  async findOne(id: string) {
    const review = await this.prisma.courseReview.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return {
      success: true,
      data: review,
    };
  }

  /**
   * Update a review
   */
  async update(id: string, userId: string, dto: UpdateReviewDto) {
    const reviewResult = await this.findOne(id);
    const review = reviewResult.data;

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    const updated = await this.prisma.courseReview.update({
      where: { id },
      data: {
        ...dto,
        status: 'PENDING', // Re-submit for moderation if edited
      },
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
    });

    // Update course statistics
    await this.updateCourseStats(review.courseId);

    return {
      success: true,
      data: updated,
      message: 'Review updated successfully. It will be re-reviewed by moderators.',
    };
  }

  /**
   * Delete a review
   */
  async remove(id: string, userId: string, isAdmin = false) {
    const reviewResult = await this.findOne(id);
    const review = reviewResult.data;

    if (!isAdmin && review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.prisma.courseReview.delete({ where: { id } });

    // Update course statistics
    await this.updateCourseStats(review.courseId);

    return {
      success: true,
      message: 'Review deleted successfully',
    };
  }

  /**
   * Mark review as helpful or not helpful
   */
  async markHelpful(reviewId: string, userId: string, isHelpful: boolean) {
    const review = await this.prisma.courseReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Check if user already voted
    const existingVote = await this.prisma.reviewHelpfulness.findUnique({
      where: {
        reviewId_userId: {
          reviewId,
          userId,
        },
      },
    });

    if (existingVote) {
      // Update vote if different
      if (existingVote.isHelpful !== isHelpful) {
        await this.prisma.reviewHelpfulness.update({
          where: { id: existingVote.id },
          data: { isHelpful },
        });

        // Update counts
        const increment = isHelpful ? 1 : -1;
        await this.prisma.courseReview.update({
          where: { id: reviewId },
          data: {
            helpfulCount: { increment },
            notHelpfulCount: { increment: -increment },
          },
        });
      }
    } else {
      // Create new vote
      await this.prisma.reviewHelpfulness.create({
        data: {
          reviewId,
          userId,
          isHelpful,
        },
      });

      // Update counts
      await this.prisma.courseReview.update({
        where: { id: reviewId },
        data: {
          helpfulCount: { increment: isHelpful ? 1 : 0 },
          notHelpfulCount: { increment: isHelpful ? 0 : 1 },
        },
      });
    }

    return {
      success: true,
      message: 'Thank you for your feedback!',
    };
  }

  /**
   * Moderate a review (Admin only)
   */
  async moderate(id: string, adminId: string, dto: ModerateReviewDto) {
    const reviewResult = await this.findOne(id);
    const review = reviewResult.data;

    const moderated = await this.prisma.courseReview.update({
      where: { id },
      data: {
        status: dto.status,
        moderatedBy: adminId,
        moderatedAt: new Date(),
        moderationNote: dto.moderationNote,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Update course statistics if approved/rejected
    if (dto.status === 'APPROVED' || dto.status === 'REJECTED') {
      await this.updateCourseStats(review.courseId);
    }

    // TODO: Send notification to user about moderation result

    return {
      success: true,
      data: moderated,
      message: `Review ${dto.status.toLowerCase()} successfully`,
    };
  }

  /**
   * Get user's own reviews
   */
  async getMyReviews(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.courseReview.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              thumbnailUrl: true,
            },
          },
        },
      }),
      this.prisma.courseReview.count({ where: { userId } }),
    ]);

    return {
      success: true,
      data: reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get course review statistics
   */
  async getCourseStats(courseId: string) {
    const reviews = await this.prisma.courseReview.findMany({
      where: {
        courseId,
        status: 'APPROVED',
      },
      select: {
        rating: true,
      },
    });

    const total = reviews.length;
    const averageRating =
      total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : null;

    // Rating distribution
    const distribution = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length,
    };

    return {
      success: true,
      data: {
        totalReviews: total,
        averageRating: averageRating ? Math.round(averageRating * 10) / 10 : null,
        distribution,
      },
    };
  }

  /**
   * Get pending reviews for moderation (Admin)
   */
  async getPendingReviews(page = 1, limit = 20) {
    return this.findAll(undefined, page, limit, 'PENDING');
  }

  /**
   * Private helper: Update course statistics
   */
  private async updateCourseStats(courseId: string) {
    const statsResult = await this.getCourseStats(courseId);
    const stats = statsResult.data;

    await this.prisma.course.update({
      where: { id: courseId },
      data: {
        averageRating: stats.averageRating,
        totalRatings: stats.totalReviews,
      },
    });
  }
}
