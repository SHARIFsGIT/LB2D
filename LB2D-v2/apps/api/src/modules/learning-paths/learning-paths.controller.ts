import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Patch,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { LearningPathsService } from './learning-paths.service';
import { CreatePathDto } from './dto/create-path.dto';
import { AddStepDto } from './dto/add-step.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Learning Paths')
@Controller('learning-paths')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LearningPathsController {
  constructor(private readonly learningPathsService: LearningPathsService) {}

  @Post()
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create learning path',
    description: 'Create a new learning path (Supervisor/Admin)',
  })
  @ApiResponse({ status: 201, description: 'Path created' })
  @ApiResponse({ status: 400, description: 'Slug already exists' })
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePathDto,
  ) {
    return this.learningPathsService.create(userId, dto);
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all learning paths',
    description: 'Get paginated list of published learning paths',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'level', required: false, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] })
  @ApiQuery({ name: 'isOfficial', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Paths retrieved' })
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('level') level?: string,
    @Query('isOfficial') isOfficial?: boolean,
  ) {
    return this.learningPathsService.findAll(page, limit, level, isOfficial);
  }

  @Get('my-paths')
  @ApiOperation({
    summary: 'Get my enrolled paths',
    description: 'Get all learning paths the user is enrolled in',
  })
  @ApiResponse({ status: 200, description: 'Enrolled paths retrieved' })
  getMyPaths(@CurrentUser('userId') userId: string) {
    return this.learningPathsService.getMyPaths(userId);
  }

  @Get(':slug')
  @Public()
  @ApiOperation({
    summary: 'Get path by slug',
    description: 'Get a single learning path with all steps',
  })
  @ApiResponse({ status: 200, description: 'Path retrieved' })
  @ApiResponse({ status: 404, description: 'Path not found' })
  findOne(@Param('slug') slug: string) {
    return this.learningPathsService.findOne(slug);
  }

  @Get(':id/stats')
  @Public()
  @ApiOperation({
    summary: 'Get path statistics',
    description: 'Get enrollment and completion statistics for a path',
  })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  getStats(@Param('id') id: string) {
    return this.learningPathsService.getStats(id);
  }

  @Post(':id/steps')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Add step to path',
    description: 'Add a course to the learning path',
  })
  @ApiResponse({ status: 201, description: 'Step added' })
  @ApiResponse({ status: 404, description: 'Path or course not found' })
  addStep(@Param('id') pathId: string, @Body() dto: AddStepDto) {
    return this.learningPathsService.addStep(pathId, dto);
  }

  @Delete(':id/steps/:stepId')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Remove step from path',
    description: 'Remove a course from the learning path',
  })
  @ApiResponse({ status: 200, description: 'Step removed' })
  removeStep(@Param('stepId') stepId: string) {
    return this.learningPathsService.removeStep(stepId);
  }

  @Post(':id/enroll')
  @ApiOperation({
    summary: 'Enroll in path',
    description: 'Enroll in a learning path',
  })
  @ApiResponse({ status: 201, description: 'Enrolled successfully' })
  @ApiResponse({ status: 400, description: 'Already enrolled or path not published' })
  enroll(
    @Param('id') pathId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.learningPathsService.enroll(userId, pathId);
  }

  @Put('enrollments/:enrollmentId/progress')
  @ApiOperation({
    summary: 'Update path progress',
    description: 'Update progress in a learning path',
  })
  @ApiResponse({ status: 200, description: 'Progress updated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  updateProgress(
    @Param('enrollmentId') enrollmentId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.learningPathsService.updateProgress(enrollmentId, userId, dto);
  }

  @Patch(':id/publish')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Publish path (Admin)',
    description: 'Make a learning path publicly available',
  })
  @ApiResponse({ status: 200, description: 'Path published' })
  publish(@Param('id') pathId: string) {
    return this.learningPathsService.publish(pathId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Delete path',
    description: 'Delete a learning path',
  })
  @ApiResponse({ status: 200, description: 'Path deleted' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  remove(
    @Param('id') pathId: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    const isAdmin = role === UserRole.ADMIN;
    return this.learningPathsService.remove(pathId, userId, isAdmin);
  }
}
