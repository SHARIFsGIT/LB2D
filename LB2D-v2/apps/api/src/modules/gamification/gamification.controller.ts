import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { GamificationService } from './gamification.service';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { LogActivityDto } from './dto/log-activity.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';

// ============================================
// ACHIEVEMENTS CONTROLLER
// ============================================

@ApiTags('Gamification - Achievements')
@Controller('achievements')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AchievementsController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create achievement (Admin)',
    description: 'Create a new achievement badge',
  })
  @ApiResponse({ status: 201, description: 'Achievement created' })
  create(@Body() dto: CreateAchievementDto) {
    return this.gamificationService.createAchievement(dto);
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all achievements',
    description: 'Get list of all available achievements',
  })
  @ApiResponse({ status: 200, description: 'Achievements retrieved' })
  findAll() {
    return this.gamificationService.findAllAchievements();
  }

  @Get('my-achievements')
  @ApiOperation({
    summary: 'Get my achievements',
    description: 'Get user achievements with progress',
  })
  @ApiResponse({ status: 200, description: 'User achievements retrieved' })
  getMyAchievements(@CurrentUser('userId') userId: string) {
    return this.gamificationService.getMyAchievements(userId);
  }
}

// ============================================
// POINTS & LEVELS CONTROLLER
// ============================================

@ApiTags('Gamification - Points')
@Controller('points')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PointsController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('my-points')
  @ApiOperation({
    summary: 'Get my points',
    description: 'Get user points, level, and streaks',
  })
  @ApiResponse({ status: 200, description: 'Points retrieved' })
  getMyPoints(@CurrentUser('userId') userId: string) {
    return this.gamificationService.getMyPoints(userId);
  }

  @Post('activity')
  @ApiOperation({
    summary: 'Log activity',
    description: 'Log user activity to award points',
  })
  @ApiResponse({ status: 200, description: 'Activity logged' })
  logActivity(
    @CurrentUser('userId') userId: string,
    @Body() dto: LogActivityDto,
  ) {
    return this.gamificationService.logActivity(userId, dto);
  }

  @Get('streak')
  @ApiOperation({
    summary: 'Get streak',
    description: 'Get user daily streak information',
  })
  @ApiResponse({ status: 200, description: 'Streak retrieved' })
  getStreak(@CurrentUser('userId') userId: string) {
    return this.gamificationService.getStreak(userId);
  }
}

// ============================================
// LEADERBOARD CONTROLLER
// ============================================

@ApiTags('Gamification - Leaderboard')
@Controller('leaderboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LeaderboardController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('all-time')
  @Public()
  @ApiOperation({
    summary: 'Get all-time leaderboard',
    description: 'Get top users of all time',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Leaderboard retrieved' })
  getAllTime(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ) {
    return this.gamificationService.getLeaderboard('ALL_TIME', page, limit);
  }

  @Get('monthly')
  @Public()
  @ApiOperation({
    summary: 'Get monthly leaderboard',
    description: 'Get top users for current month',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Leaderboard retrieved' })
  getMonthly(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ) {
    return this.gamificationService.getLeaderboard('MONTHLY', page, limit);
  }

  @Get('weekly')
  @Public()
  @ApiOperation({
    summary: 'Get weekly leaderboard',
    description: 'Get top users for current week',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Leaderboard retrieved' })
  getWeekly(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ) {
    return this.gamificationService.getLeaderboard('WEEKLY', page, limit);
  }

  @Get('my-rank')
  @ApiOperation({
    summary: 'Get my rank',
    description: 'Get user rank for all periods',
  })
  @ApiQuery({ name: 'period', required: false, enum: ['ALL_TIME', 'MONTHLY', 'WEEKLY'] })
  @ApiResponse({ status: 200, description: 'Rank retrieved' })
  getMyRank(
    @CurrentUser('userId') userId: string,
    @Query('period') period = 'ALL_TIME',
  ) {
    return this.gamificationService.getMyRank(userId, period);
  }
}
