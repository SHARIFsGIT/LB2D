import { Module } from '@nestjs/common';
import {
  DiscussionCategoriesController,
  DiscussionTopicsController,
  DiscussionPostsController,
  PostActionsController,
} from './discussions.controller';
import { DiscussionsService } from './discussions.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    DiscussionCategoriesController,
    DiscussionTopicsController,
    DiscussionPostsController,
    PostActionsController,
  ],
  providers: [DiscussionsService],
  exports: [DiscussionsService],
})
export class DiscussionsModule {}
