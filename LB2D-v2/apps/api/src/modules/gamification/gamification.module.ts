import { Module } from '@nestjs/common';
import {
  AchievementsController,
  PointsController,
  LeaderboardController,
} from './gamification.controller';
import { GamificationService } from './gamification.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    AchievementsController,
    PointsController,
    LeaderboardController,
  ],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
