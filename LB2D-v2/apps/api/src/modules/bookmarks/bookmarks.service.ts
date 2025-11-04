import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class BookmarksService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // BOOKMARKS
  // ============================================

  async createBookmark(userId: string, dto: CreateBookmarkDto) {
    // Validate at least one entity is provided
    if (!dto.courseId && !dto.videoId && !dto.topicId) {
      throw new BadRequestException('Must bookmark a course, video, or topic');
    }

    // Check if bookmark already exists
    const where: any = { userId };
    if (dto.courseId) where.courseId = dto.courseId;
    if (dto.videoId) where.videoId = dto.videoId;
    if (dto.topicId) where.topicId = dto.topicId;

    const existing = await this.prisma.bookmark.findFirst({ where });

    if (existing) {
      throw new BadRequestException('Already bookmarked');
    }

    // Verify entity exists
    if (dto.courseId) {
      const course = await this.prisma.course.findUnique({ where: { id: dto.courseId } });
      if (!course) throw new NotFoundException('Course not found');
    }

    if (dto.videoId) {
      const video = await this.prisma.video.findUnique({ where: { id: dto.videoId } });
      if (!video) throw new NotFoundException('Video not found');
    }

    if (dto.topicId) {
      const topic = await this.prisma.discussionTopic.findUnique({ where: { id: dto.topicId } });
      if (!topic) throw new NotFoundException('Topic not found');
    }

    const bookmark = await this.prisma.bookmark.create({
      data: {
        userId,
        courseId: dto.courseId,
        videoId: dto.videoId,
        topicId: dto.topicId,
        note: dto.note,
        collection: dto.collection,
        tags: dto.tags || [],
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
          },
        },
        video: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
          },
        },
        topic: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return { success: true, data: bookmark, message: 'Bookmark created' };
  }

  async findAll(userId: string, collection?: string, tags?: string[]) {
    const where: any = { userId };
    if (collection) where.collection = collection;
    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    const bookmarks = await this.prisma.bookmark.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            level: true,
          },
        },
        video: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            duration: true,
          },
        },
        topic: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    return { success: true, data: bookmarks };
  }

  async getCollections(userId: string) {
    const bookmarks = await this.prisma.bookmark.findMany({
      where: { userId, collection: { not: null } },
      select: { collection: true },
      distinct: ['collection'],
    });

    const collections = bookmarks
      .map(b => b.collection)
      .filter((c): c is string => c !== null);

    return { success: true, data: collections };
  }

  async remove(id: string, userId: string) {
    const bookmark = await this.prisma.bookmark.findUnique({ where: { id } });

    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }

    if (bookmark.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    await this.prisma.bookmark.delete({ where: { id } });

    return { success: true, message: 'Bookmark removed' };
  }

  // ============================================
  // VIDEO NOTES
  // ============================================

  async createNote(userId: string, dto: CreateNoteDto) {
    // Verify video exists
    const video = await this.prisma.video.findUnique({
      where: { id: dto.videoId },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const note = await this.prisma.videoNote.create({
      data: {
        userId,
        videoId: dto.videoId,
        timestamp: dto.timestamp,
        content: dto.content,
        isPrivate: dto.isPrivate !== false,
      },
    });

    return { success: true, data: note, message: 'Note created' };
  }

  async findVideoNotes(userId: string, videoId: string) {
    const notes = await this.prisma.videoNote.findMany({
      where: { userId, videoId },
      orderBy: { timestamp: 'asc' },
    });

    return { success: true, data: notes };
  }

  async updateNote(id: string, userId: string, dto: UpdateNoteDto) {
    const note = await this.prisma.videoNote.findUnique({ where: { id } });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    if (note.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    const updated = await this.prisma.videoNote.update({
      where: { id },
      data: dto,
    });

    return { success: true, data: updated };
  }

  async removeNote(id: string, userId: string) {
    const note = await this.prisma.videoNote.findUnique({ where: { id } });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    if (note.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    await this.prisma.videoNote.delete({ where: { id } });

    return { success: true, message: 'Note deleted' };
  }
}
