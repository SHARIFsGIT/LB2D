import { Module } from '@nestjs/common';
import { BookmarksController, VideoNotesController } from './bookmarks.controller';
import { BookmarksService } from './bookmarks.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BookmarksController, VideoNotesController],
  providers: [BookmarksService],
  exports: [BookmarksService],
})
export class BookmarksModule {}
