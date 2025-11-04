import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('admin/dashboard')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get admin dashboard (Admin)',
    description: 'Get comprehensive platform statistics for admin',
  })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getAdminDashboard() {
    return this.analyticsService.getAdminDashboard();
  }

  @Get('supervisor/dashboard')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get supervisor dashboard',
    description: 'Get statistics for supervisor courses',
  })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getSupervisorDashboard(@CurrentUser('userId') userId: string) {
    return this.analyticsService.getSupervisorDashboard(userId);
  }

  @Get('student/dashboard')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Get student dashboard',
    description: 'Get student progress and statistics',
  })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getStudentDashboard(@CurrentUser('userId') userId: string) {
    return this.analyticsService.getStudentDashboard(userId);
  }
}
