import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { StorageService } from '@/common/storage/storage.service';
import { EmailService } from '@/common/email/email.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { UpdateVideoProgressDto } from './dto/update-video-progress.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ApproveVideoDto } from './dto/approve-video.dto';

@Injectable()
export class VideosService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private emailService: EmailService,
  ) {}

  /**
   * Upload and create video (Supervisor)
   */
  async create(
    createVideoDto: CreateVideoDto,
    videoFile?: Express.Multer.File,
    thumbnailFile?: Express.Multer.File,
  ) {
    // Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id: createVideoDto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    let videoUrl = createVideoDto.videoUrl;
    let thumbnailUrl = createVideoDto.thumbnailUrl;

    // Upload video file if provided
    if (videoFile) {
      videoUrl = await this.storageService.uploadFile(
        videoFile,
        `videos/${createVideoDto.courseId}`,
      );
    }

    // Upload thumbnail if provided
    if (thumbnailFile) {
      thumbnailUrl = await this.storageService.uploadFile(
        thumbnailFile,
        `thumbnails/videos`,
      );
    }

    const video = await this.prisma.video.create({
      data: {
        courseId: createVideoDto.courseId,
        title: createVideoDto.title,
        description: createVideoDto.description,
        videoUrl: videoUrl || '',
        thumbnailUrl,
        duration: createVideoDto.duration,
        order: createVideoDto.order,
        status: 'PENDING', // Requires admin approval
        size: videoFile ? BigInt(videoFile.size) : null,
        format: videoFile ? videoFile.mimetype.split('/')[1] : null,
      },
      include: {
        course: {
          select: {
            title: true,
          },
        },
      },
    });

    // Notify admin of new video for approval
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { email: true, firstName: true },
    });

    admins.forEach((admin) => {
      this.emailService
        .sendUrgentNotification(
          admin.email,
          admin.firstName,
          'New Video Pending Approval',
          `A new video "${video.title}" in course "${video.course.title}" is awaiting your approval.`,
        )
        .catch((err) => console.error('Failed to send email:', err));
    });

    return {
      message: 'Video uploaded successfully. Awaiting admin approval.',
      video,
    };
  }

  /**
   * Get all videos for a course
   */
  async findByCourse(courseId: string, userId?: string, includeAll: boolean = false) {
    const where: any = { courseId };

    // Only show approved videos to students
    if (!includeAll) {
      where.status = 'APPROVED';
    }

    const videos = await this.prisma.video.findMany({
      where,
      orderBy: { order: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        videoUrl: true,
        thumbnailUrl: true,
        duration: true,
        order: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    // Get progress for each video if userId provided
    if (userId) {
      const videoIds = videos.map((v) => v.id);
      const progressRecords = await this.prisma.videoProgress.findMany({
        where: {
          userId,
          videoId: { in: videoIds },
        },
      });

      const progressMap = new Map(
        progressRecords.map((p) => [p.videoId, p]),
      );

      return {
        videos: videos.map((video) => ({
          ...video,
          progress: progressMap.get(video.id) || null,
        })),
      };
    }

    return { videos };
  }

  /**
   * Get video by ID
   */
  async findOne(id: string, userId?: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            supervisorId: true,
          },
        },
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    // Get user's progress if userId provided
    let progress = null;
    if (userId) {
      progress = await this.prisma.videoProgress.findUnique({
        where: {
          userId_videoId: {
            userId,
            videoId: id,
          },
        },
      });
    }

    return {
      video,
      progress,
    };
  }

  /**
   * Update video
   */
  async update(id: string, updateVideoDto: UpdateVideoDto) {
    const video = await this.prisma.video.findUnique({
      where: { id },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const updatedVideo = await this.prisma.video.update({
      where: { id },
      data: updateVideoDto,
    });

    return {
      message: 'Video updated successfully',
      video: updatedVideo,
    };
  }

  /**
   * Delete video
   */
  async remove(id: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    // Delete video file from storage
    if (video.videoUrl) {
      await this.storageService.deleteFile(video.videoUrl);
    }

    // Delete thumbnail if exists
    if (video.thumbnailUrl) {
      await this.storageService.deleteFile(video.thumbnailUrl);
    }

    // Delete video (cascade will delete progress and comments)
    await this.prisma.video.delete({
      where: { id },
    });

    return {
      message: 'Video deleted successfully',
    };
  }

  /**
   * Update video progress
   */
  async updateProgress(
    videoId: string,
    userId: string,
    updateProgressDto: UpdateVideoProgressDto,
  ) {
    // Verify video exists
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    // Upsert progress
    const progress = await this.prisma.videoProgress.upsert({
      where: {
        userId_videoId: {
          userId,
          videoId,
        },
      },
      update: {
        progress: updateProgressDto.progress,
        currentTime: updateProgressDto.currentTime,
        completed: updateProgressDto.completed || updateProgressDto.progress >= 95,
        completedAt:
          updateProgressDto.completed || updateProgressDto.progress >= 95
            ? new Date()
            : null,
      },
      create: {
        userId,
        videoId,
        progress: updateProgressDto.progress,
        currentTime: updateProgressDto.currentTime,
        completed: updateProgressDto.completed || updateProgressDto.progress >= 95,
        completedAt:
          updateProgressDto.completed || updateProgressDto.progress >= 95
            ? new Date()
            : null,
      },
    });

    // TODO: Update course progress
    // await this.coursesService.updateCourseProgress(userId, video.courseId);

    return {
      message: 'Progress updated successfully',
      progress,
    };
  }

  /**
   * Get video comments
   */
  async getComments(videoId: string) {
    const comments = await this.prisma.videoComment.findMany({
      where: {
        videoId,
        parentId: null, // Only top-level comments
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            role: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePhoto: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { comments };
  }

  /**
   * Add comment to video
   */
  async addComment(
    videoId: string,
    userId: string,
    createCommentDto: CreateCommentDto,
  ) {
    // Verify video exists
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    // If replying to a comment, verify parent exists
    if (createCommentDto.parentId) {
      const parentComment = await this.prisma.videoComment.findUnique({
        where: { id: createCommentDto.parentId },
      });

      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    const comment = await this.prisma.videoComment.create({
      data: {
        videoId,
        userId,
        content: createCommentDto.content,
        parentId: createCommentDto.parentId,
      },
      include: {
        user: {
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

    // TODO: Send WebSocket update to all users watching this video
    // TODO: Notify comment author if this is a reply

    return {
      message: 'Comment added successfully',
      comment,
    };
  }

  /**
   * Update comment
   */
  async updateComment(commentId: string, userId: string, content: string) {
    const comment = await this.prisma.videoComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const updatedComment = await this.prisma.videoComment.update({
      where: { id: commentId },
      data: { content },
      include: {
        user: {
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

    return {
      message: 'Comment updated successfully',
      comment: updatedComment,
    };
  }

  /**
   * Delete comment
   */
  async deleteComment(commentId: string, userId: string, userRole: string) {
    const comment = await this.prisma.videoComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only comment author or admin can delete
    if (comment.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException(
        'You can only delete your own comments',
      );
    }

    await this.prisma.videoComment.delete({
      where: { id: commentId },
    });

    return {
      message: 'Comment deleted successfully',
    };
  }

  /**
   * Get pending videos for approval (Admin)
   */
  async getPendingVideos() {
    const videos = await this.prisma.video.findMany({
      where: { status: 'PENDING' },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            supervisor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return { videos };
  }

  /**
   * Approve or reject video (Admin)
   */
  async approveVideo(id: string, approveVideoDto: ApproveVideoDto, adminId: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            supervisorId: true,
          },
        },
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (video.status !== 'PENDING') {
      throw new BadRequestException('Video is not pending approval');
    }

    if (approveVideoDto.approve) {
      // Approve video
      const updatedVideo = await this.prisma.video.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          approvedBy: adminId,
          rejectionReason: null,
        },
        include: {
          course: {
            select: {
              title: true,
              supervisor: {
                select: {
                  email: true,
                  firstName: true,
                },
              },
            },
          },
        },
      });

      // Notify supervisor of approval
      this.emailService
        .sendVideoApprovalNotification(
          updatedVideo.course.supervisor.email,
          updatedVideo.course.supervisor.firstName,
          updatedVideo.title,
          updatedVideo.course.title,
        )
        .catch((err) => console.error('Failed to send email:', err));

      return {
        message: 'Video approved successfully',
      };
    } else {
      // Reject video
      const rejectedVideo = await this.prisma.video.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectionReason: approveVideoDto.rejectionReason,
        },
        include: {
          course: {
            select: {
              title: true,
              supervisor: {
                select: {
                  email: true,
                  firstName: true,
                },
              },
            },
          },
        },
      });

      // Notify supervisor of rejection
      this.emailService
        .sendVideoRejectionNotification(
          rejectedVideo.course.supervisor.email,
          rejectedVideo.course.supervisor.firstName,
          rejectedVideo.title,
          rejectedVideo.course.title,
          approveVideoDto.rejectionReason || 'Please review the feedback and resubmit.',
        )
        .catch((err) => console.error('Failed to send email:', err));

      return {
        message: 'Video rejected',
      };
    }
  }
}
