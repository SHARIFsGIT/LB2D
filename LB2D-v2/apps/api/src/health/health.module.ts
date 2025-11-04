import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { CacheModule } from '@/common/cache/cache.module';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [HealthController],
})
export class HealthModule {}
