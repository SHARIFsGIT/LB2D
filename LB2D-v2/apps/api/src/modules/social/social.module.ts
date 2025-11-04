import { Module } from '@nestjs/common';
import {
  FollowController,
  ActivityController,
  PublicProfileController,
} from './social.controller';
import { SocialService } from './social.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    FollowController,
    ActivityController,
    PublicProfileController,
  ],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}
