import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CacheService } from '@/common/cache/cache.service';
import { Public } from '@/modules/auth/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Check if API is running',
  })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  async check() {
    return {
      success: true,
      message: 'API is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    };
  }

  @Public()
  @Get('detailed')
  @ApiOperation({
    summary: 'Detailed health check',
    description: 'Check all services (database, cache, etc.)',
  })
  @ApiResponse({ status: 200, description: 'Detailed health status' })
  async detailedCheck() {
    const checks = {
      api: { status: 'healthy', message: 'API is running' },
      database: { status: 'unknown', message: '' },
      cache: { status: 'unknown', message: '' },
    };

    // Check database
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'healthy', message: 'Database connected' };
    } catch (error) {
      checks.database = {
        status: 'unhealthy',
        message: 'Database connection failed',
      };
    }

    // Check cache
    try {
      await this.cache.set('health-check', 'ok', 10);
      const value = await this.cache.get('health-check');
      if (value === 'ok') {
        checks.cache = { status: 'healthy', message: 'Cache connected' };
      } else {
        checks.cache = { status: 'degraded', message: 'Cache read/write issue' };
      }
    } catch (error) {
      checks.cache = {
        status: 'unhealthy',
        message: 'Cache not available',
      };
    }

    const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');

    return {
      success: allHealthy,
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '2.0.0',
    };
  }
}
