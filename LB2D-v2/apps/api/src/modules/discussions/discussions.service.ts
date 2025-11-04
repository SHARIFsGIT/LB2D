import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateTopicDto } from './dto/create-topic.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';

@Injectable()
export class DiscussionsService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // CATEGORIES
  // ============================================

  async createCategory(dto: CreateCategoryDto) {
    const slug = dto.slug || this.generateSlug(dto.name);

    // Check if slug exists
    const existing = await this.prisma.discussionCategory.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new BadRequestException('Category with this slug already exists');
    }

    const category = await this.prisma.discussionCategory.create({
      data: {
        name: dto.name,
        description: dto.description,
        slug,
        icon: dto.icon,
        order: dto.order || 0,
        color: dto.color,
        requiresApproval: dto.requiresApproval || false,
      },
    });

    return { success: true, data: category };
  }

  async findAllCategories() {
    const categories = await this.prisma.discussionCategory.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { topics: true },
        },
      },
    });

    return { success: true, data: categories };
  }

  async findCategory(slug: string) {
    const category = await this.prisma.discussionCategory.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { topics: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return { success: true, data: category };
  }

  // ============================================
  // TOPICS
  // ============================================

  async createTopic(userId: string, dto: CreateTopicDto) {
    // Verify category exists
    const category = await this.prisma.discussionCategory.findUnique({
      where: { slug: dto.categorySlug },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Verify course if provided
    if (dto.courseId) {
      const course = await this.prisma.course.findUnique({
        where: { id: dto.courseId },
      });
      if (!course) {
        throw new NotFoundException('Course not found');
      }
    }

    // Generate slug from title
    const slug = this.generateSlug(dto.title);

    // Ensure unique slug
    let uniqueSlug = slug;
    let counter = 1;
    while (await this.prisma.discussionTopic.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    const topic = await this.prisma.discussionTopic.create({
      data: {
        categoryId: category.id,
        courseId: dto.courseId,
        userId,
        title: dto.title,
        content: dto.content,
        slug: uniqueSlug,
        type: dto.type,
        tags: dto.tags || [],
        metaDescription: dto.metaDescription,
        status: category.requiresApproval ? 'ACTIVE' : 'ACTIVE', // Can add approval logic
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
        category: {
          select: {
            name: true,
            slug: true,
            icon: true,
          },
        },
      },
    });

    // Update category topic count
    await this.prisma.discussionCategory.update({
      where: { id: category.id },
      data: { topicCount: { increment: 1 } },
    });

    return { success: true, data: topic, message: 'Topic created successfully' };
  }

  async findAllTopics(
    categorySlug?: string,
    courseId?: string,
    page = 1,
    limit = 20,
    search?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = { status: 'ACTIVE' };

    if (categorySlug) {
      const category = await this.prisma.discussionCategory.findUnique({
        where: { slug: categorySlug },
      });
      if (category) {
        where.categoryId = category.id;
      }
    }

    if (courseId) {
      where.courseId = courseId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [topics, total] = await Promise.all([
      this.prisma.discussionTopic.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isPinned: 'desc' }, { lastActivityAt: 'desc' }],
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
            },
          },
          category: {
            select: {
              name: true,
              slug: true,
              icon: true,
            },
          },
          _count: {
            select: { posts: true },
          },
        },
      }),
      this.prisma.discussionTopic.count({ where }),
    ]);

    return {
      success: true,
      data: topics,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findTopic(slug: string) {
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { slug },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
        category: {
          select: {
            name: true,
            slug: true,
            icon: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: { posts: true },
        },
      },
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    // Increment view count
    await this.prisma.discussionTopic.update({
      where: { id: topic.id },
      data: { viewCount: { increment: 1 } },
    });

    return { success: true, data: topic };
  }

  async updateTopic(id: string, userId: string, dto: UpdateTopicDto, isAdmin = false) {
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id },
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    if (!isAdmin && topic.userId !== userId) {
      throw new ForbiddenException('You can only update your own topics');
    }

    const updated = await this.prisma.discussionTopic.update({
      where: { id },
      data: dto,
    });

    return { success: true, data: updated };
  }

  async deleteTopic(id: string, userId: string, isAdmin = false) {
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id },
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    if (!isAdmin && topic.userId !== userId) {
      throw new ForbiddenException('You can only delete your own topics');
    }

    await this.prisma.discussionTopic.delete({ where: { id } });

    return { success: true, message: 'Topic deleted successfully' };
  }

  async pinTopic(id: string) {
    const topic = await this.prisma.discussionTopic.update({
      where: { id },
      data: { isPinned: true },
    });

    return { success: true, data: topic };
  }

  async lockTopic(id: string) {
    const topic = await this.prisma.discussionTopic.update({
      where: { id },
      data: { isLocked: true },
    });

    return { success: true, data: topic };
  }

  async likeTopic(topicId: string, userId: string) {
    // Check if already liked
    const existing = await this.prisma.discussionLike.findUnique({
      where: {
        userId_topicId: { userId, topicId },
      },
    });

    if (existing) {
      // Unlike
      await this.prisma.discussionLike.delete({ where: { id: existing.id } });
      await this.prisma.discussionTopic.update({
        where: { id: topicId },
        data: { likeCount: { decrement: 1 } },
      });
      return { success: true, message: 'Topic unliked' };
    } else {
      // Like
      await this.prisma.discussionLike.create({
        data: { userId, topicId },
      });
      await this.prisma.discussionTopic.update({
        where: { id: topicId },
        data: { likeCount: { increment: 1 } },
      });
      return { success: true, message: 'Topic liked' };
    }
  }

  // ============================================
  // POSTS
  // ============================================

  async createPost(topicId: string, userId: string, dto: CreatePostDto) {
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    if (topic.isLocked) {
      throw new BadRequestException('This topic is locked');
    }

    // Verify parent post if replying
    if (dto.parentId) {
      const parentPost = await this.prisma.discussionPost.findUnique({
        where: { id: dto.parentId },
      });
      if (!parentPost || parentPost.topicId !== topicId) {
        throw new NotFoundException('Parent post not found');
      }
    }

    const post = await this.prisma.discussionPost.create({
      data: {
        topicId,
        userId,
        content: dto.content,
        parentId: dto.parentId,
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

    // Update topic reply count and last activity
    await this.prisma.discussionTopic.update({
      where: { id: topicId },
      data: {
        replyCount: { increment: 1 },
        lastActivityAt: new Date(),
      },
    });

    return { success: true, data: post };
  }

  async findTopicPosts(topicId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.prisma.discussionPost.findMany({
        where: {
          topicId,
          isDeleted: false,
          parentId: null, // Only root posts
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
            },
          },
          replies: {
            where: { isDeleted: false },
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
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      this.prisma.discussionPost.count({
        where: { topicId, isDeleted: false, parentId: null },
      }),
    ]);

    return {
      success: true,
      data: posts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deletePost(id: string, userId: string, isAdmin = false) {
    const post = await this.prisma.discussionPost.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (!isAdmin && post.userId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    // Soft delete
    await this.prisma.discussionPost.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return { success: true, message: 'Post deleted successfully' };
  }

  async likePost(postId: string, userId: string) {
    const existing = await this.prisma.discussionLike.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    if (existing) {
      // Unlike
      await this.prisma.discussionLike.delete({ where: { id: existing.id } });
      await this.prisma.discussionPost.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
      });
      return { success: true, message: 'Post unliked' };
    } else {
      // Like
      await this.prisma.discussionLike.create({
        data: { userId, postId },
      });
      await this.prisma.discussionPost.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      });
      return { success: true, message: 'Post liked' };
    }
  }

  async markBestAnswer(topicId: string, postId: string, userId: string) {
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
      include: { user: true },
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    // Only topic author can mark best answer
    if (topic.userId !== userId) {
      throw new ForbiddenException('Only the topic author can mark the best answer');
    }

    // Verify post belongs to this topic
    const post = await this.prisma.discussionPost.findUnique({
      where: { id: postId },
    });

    if (!post || post.topicId !== topicId) {
      throw new BadRequestException('Invalid post');
    }

    const updated = await this.prisma.discussionTopic.update({
      where: { id: topicId },
      data: { bestAnswerId: postId },
    });

    return { success: true, data: updated, message: 'Best answer marked' };
  }

  async searchTopics(query: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [topics, total] = await Promise.all([
      this.prisma.discussionTopic.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
            { tags: { has: query.toLowerCase() } },
          ],
        },
        skip,
        take: limit,
        orderBy: { lastActivityAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          category: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      }),
      this.prisma.discussionTopic.count({
        where: {
          status: 'ACTIVE',
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
            { tags: { has: query.toLowerCase() } },
          ],
        },
      }),
    ]);

    return {
      success: true,
      data: topics,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
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
