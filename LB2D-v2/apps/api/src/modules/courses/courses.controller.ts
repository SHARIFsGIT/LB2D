import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { EnrollCourseDto } from './dto/enroll-course.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Courses')
@Controller('courses')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create course (Supervisor/Admin)',
    description: 'Create a new course',
  })
  @ApiResponse({ status: 201, description: 'Course created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or slug exists' })
  async create(
    @Body() createCourseDto: CreateCourseDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.coursesService.create(createCourseDto, userId);
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all courses',
    description: 'Get paginated list of courses with optional filtering',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'level', required: false, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'publishedOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Courses retrieved successfully' })
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('level') level?: string,
    @Query('search') search?: string,
    @Query('publishedOnly', new ParseBoolPipe({ optional: true }))
    publishedOnly?: boolean,
  ) {
    return this.coursesService.findAll(
      page,
      limit,
      level,
      search,
      undefined,
      publishedOnly,
    );
  }

  @Get('my-enrollments')
  @ApiOperation({
    summary: 'Get my enrolled courses',
    description: 'Get all courses current user is enrolled in',
  })
  @ApiResponse({ status: 200, description: 'Enrollments retrieved successfully' })
  async getMyEnrollments(@CurrentUser('userId') userId: string) {
    return this.coursesService.getMyEnrollments(userId);
  }

  @Get('my-courses')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get my created courses (Supervisor)',
    description: 'Get all courses created by current supervisor',
  })
  @ApiResponse({ status: 200, description: 'Courses retrieved successfully' })
  async getMyCourses(
    @CurrentUser('userId') userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.coursesService.findAll(page, limit, undefined, undefined, userId, false);
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get course by ID',
    description: 'Get detailed course information',
  })
  @ApiResponse({ status: 200, description: 'Course retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('userId') userId?: string,
  ) {
    return this.coursesService.findOne(id, userId);
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({
    summary: 'Get course by slug',
    description: 'Get course by URL-friendly slug',
  })
  @ApiResponse({ status: 200, description: 'Course retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async findBySlug(
    @Param('slug') slug: string,
    @CurrentUser('userId') userId?: string,
  ) {
    return this.coursesService.findBySlug(slug, userId);
  }

  @Put(':id')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update course',
    description: 'Update course details (own courses or admin)',
  })
  @ApiResponse({ status: 200, description: 'Course updated successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.coursesService.update(id, updateCourseDto, userId, userRole);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Delete course',
    description: 'Delete course (own courses or admin)',
  })
  @ApiResponse({ status: 200, description: 'Course deleted successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 400, description: 'Cannot delete course with enrollments' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.coursesService.remove(id, userId, userRole);
  }

  @Post('enroll')
  @ApiOperation({
    summary: 'Enroll in course',
    description: 'Enroll current user in a course',
  })
  @ApiResponse({ status: 201, description: 'Enrolled successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 400, description: 'Already enrolled or payment required' })
  async enroll(
    @Body() enrollCourseDto: EnrollCourseDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.coursesService.enroll(enrollCourseDto, userId);
  }

  @Get(':id/stats')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get course statistics',
    description: 'Get detailed course statistics (supervisor/admin)',
  })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async getCourseStats(@Param('id') id: string) {
    return this.coursesService.getCourseStats(id);
  }
}
