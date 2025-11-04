import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { StorageService } from '@/common/storage/storage.service';
import { EmailService } from '@/common/email/email.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ApproveResourceDto } from './dto/approve-resource.dto';
import { MarkProgressDto } from './dto/mark-progress.dto';

@Injectable()
export class ResourcesService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private emailService: EmailService,
  ) {}

  /**
   * Upload and create resource (Supervisor)
   */
  async create(
    createResourceDto: CreateResourceDto,
    file?: Express.Multer.File,
  ) {
    // Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id: createResourceDto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    let fileUrl = createResourceDto.fileUrl;
    let fileType = createResourceDto.fileType;
    let fileSize: bigint | null = null;

    // Upload file if provided
    if (file) {
      fileUrl = await this.storageService.uploadFile(
        file,
        `resources/${createResourceDto.courseId}`,
      );
      fileType = file.mimetype.split('/')[1] || file.originalname.split('.').pop();
      fileSize = BigInt(file.size);
    }

    const resource = await this.prisma.courseResource.create({
      data: {
        courseId: createResourceDto.courseId,
        title: createResourceDto.title,
        description: createResourceDto.description,
        fileUrl: fileUrl || '',
        fileType: fileType || 'unknown',
        fileSize: fileSize || BigInt(0),
        order: createResourceDto.order,
        status: 'PENDING', // Requires admin approval
      },
      include: {
        course: {
          select: {
            title: true,
          },
        },
      },
    });

    // Notify admin of new resource for approval
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { email: true, firstName: true },
    });

    admins.forEach((admin) => {
      this.emailService
        .sendUrgentNotification(
          admin.email,
          admin.firstName,
          'New Resource Pending Approval',
          `A new resource "${resource.title}" in course "${resource.course.title}" is awaiting your approval.`,
        )
        .catch((err) => console.error('Failed to send email:', err));
    });

    return {
      message: 'Resource uploaded successfully. Awaiting admin approval.',
      resource,
    };
  }

  /**
   * Get all resources for a course
   */
  async findByCourse(courseId: string, userId?: string, includeAll: boolean = false) {
    const where: any = { courseId };

    // Only show approved resources to students
    if (!includeAll) {
      where.status = 'APPROVED';
    }

    const resources = await this.prisma.courseResource.findMany({
      where,
      orderBy: { order: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        fileUrl: true,
        fileType: true,
        fileSize: true,
        order: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
      },
    });

    // Get progress for each resource if userId provided
    if (userId) {
      const resourceIds = resources.map((r) => r.id);
      const progressRecords = await this.prisma.resourceProgress.findMany({
        where: {
          userId,
          resourceId: { in: resourceIds },
        },
      });

      const progressMap = new Map(
        progressRecords.map((p) => [p.resourceId, p]),
      );

      return {
        resources: resources.map((resource) => ({
          ...resource,
          progress: progressMap.get(resource.id) || null,
        })),
      };
    }

    return { resources };
  }

  /**
   * Get resource by ID
   */
  async findOne(id: string, userId?: string) {
    const resource = await this.prisma.courseResource.findUnique({
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

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    // Get user's progress if userId provided
    let progress = null;
    if (userId) {
      progress = await this.prisma.resourceProgress.findUnique({
        where: {
          userId_resourceId: {
            userId,
            resourceId: id,
          },
        },
      });
    }

    return {
      resource,
      progress,
    };
  }

  /**
   * Update resource
   */
  async update(id: string, updateResourceDto: UpdateResourceDto) {
    const resource = await this.prisma.courseResource.findUnique({
      where: { id },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    const updatedResource = await this.prisma.courseResource.update({
      where: { id },
      data: updateResourceDto,
    });

    return {
      message: 'Resource updated successfully',
      resource: updatedResource,
    };
  }

  /**
   * Delete resource
   */
  async remove(id: string) {
    const resource = await this.prisma.courseResource.findUnique({
      where: { id },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    // Delete file from storage
    if (resource.fileUrl) {
      await this.storageService.deleteFile(resource.fileUrl);
    }

    // Delete resource (cascade will delete progress)
    await this.prisma.courseResource.delete({
      where: { id },
    });

    return {
      message: 'Resource deleted successfully',
    };
  }

  /**
   * Mark resource progress
   */
  async markProgress(
    resourceId: string,
    userId: string,
    markProgressDto: MarkProgressDto,
  ) {
    // Verify resource exists
    const resource = await this.prisma.courseResource.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        courseId: true,
      },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    // Upsert progress
    const progress = await this.prisma.resourceProgress.upsert({
      where: {
        userId_resourceId: {
          userId,
          resourceId,
        },
      },
      update: {
        viewed: markProgressDto.viewed ?? undefined,
        downloaded: markProgressDto.downloaded ?? undefined,
        completed: markProgressDto.completed ?? undefined,
        completedAt: markProgressDto.completed ? new Date() : undefined,
      },
      create: {
        userId,
        resourceId,
        viewed: markProgressDto.viewed || false,
        downloaded: markProgressDto.downloaded || false,
        completed: markProgressDto.completed || false,
        completedAt: markProgressDto.completed ? new Date() : null,
      },
    });

    // TODO: Update course progress

    return {
      message: 'Progress updated successfully',
      progress,
    };
  }

  /**
   * Get pending resources for approval (Admin)
   */
  async getPendingResources() {
    const resources = await this.prisma.courseResource.findMany({
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

    return { resources };
  }

  /**
   * Approve or reject resource (Admin)
   */
  async approveResource(
    id: string,
    approveResourceDto: ApproveResourceDto,
    adminId: string,
  ) {
    const resource = await this.prisma.courseResource.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            supervisorId: true,
          },
        },
      },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    if (resource.status !== 'PENDING') {
      throw new BadRequestException('Resource is not pending approval');
    }

    if (approveResourceDto.approve) {
      // Approve resource
      const updatedResource = await this.prisma.courseResource.update({
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
        .sendResourceApprovalNotification(
          updatedResource.course.supervisor.email,
          updatedResource.course.supervisor.firstName,
          updatedResource.title,
          updatedResource.course.title,
        )
        .catch((err) => console.error('Failed to send email:', err));

      return {
        message: 'Resource approved successfully',
      };
    } else {
      // Reject resource
      const rejectedResource = await this.prisma.courseResource.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectionReason: approveResourceDto.rejectionReason,
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
        .sendResourceRejectionNotification(
          rejectedResource.course.supervisor.email,
          rejectedResource.course.supervisor.firstName,
          rejectedResource.title,
          rejectedResource.course.title,
          approveResourceDto.rejectionReason || 'Please review the feedback and resubmit.',
        )
        .catch((err) => console.error('Failed to send email:', err));

      return {
        message: 'Resource rejected',
      };
    }
  }
}
