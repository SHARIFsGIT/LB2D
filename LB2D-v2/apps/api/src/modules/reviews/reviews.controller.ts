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
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { MarkHelpfulDto } from './dto/mark-helpful.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Reviews')
@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @Roles(UserRole.STUDENT, UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create a review',
    description: 'Create a review for a course. Requires course enrollment.',
  })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  @ApiResponse({ status: 400, description: 'Already reviewed or invalid course' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async create(
    @CurrentUser('userId') userId: string,
    @Body() createReviewDto: CreateReviewDto,
  ) {
    return this.reviewsService.create(userId, createReviewDto);
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all reviews',
    description: 'Get paginated list of approved reviews with optional filtering',
  })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'] })
  @ApiResponse({ status: 200, description: 'Reviews retrieved successfully' })
  async findAll(
    @Query('courseId') courseId?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('status') status?: string,
  ) {
    return this.reviewsService.findAll(courseId, page, limit, status);
  }

  @Get('my-reviews')
  @ApiOperation({
    summary: 'Get my reviews',
    description: 'Get all reviews written by the current user',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'User reviews retrieved successfully' })
  async getMyReviews(
    @CurrentUser('userId') userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return this.reviewsService.getMyReviews(userId, page, limit);
  }

  @Get('pending')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get pending reviews (Admin)',
    description: 'Get all reviews pending moderation',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Pending reviews retrieved' })
  async getPendingReviews(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.reviewsService.getPendingReviews(page, limit);
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get review by ID',
    description: 'Get a single review by its ID',
  })
  @ApiResponse({ status: 200, description: 'Review retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update review',
    description: 'Update your own review',
  })
  @ApiResponse({ status: 200, description: 'Review updated successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to update this review' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async update(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, userId, updateReviewDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete review',
    description: 'Delete your own review or any review (admin)',
  })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to delete this review' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    const isAdmin = role === UserRole.ADMIN;
    return this.reviewsService.remove(id, userId, isAdmin);
  }

  @Post(':id/helpful')
  @ApiOperation({
    summary: 'Mark review as helpful',
    description: 'Vote whether a review was helpful or not',
  })
  @ApiResponse({ status: 200, description: 'Vote recorded successfully' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async markHelpful(
    @Param('id') reviewId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: MarkHelpfulDto,
  ) {
    return this.reviewsService.markHelpful(reviewId, userId, dto.isHelpful);
  }

  @Patch(':id/moderate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Moderate review (Admin)',
    description: 'Approve, reject, or flag a review',
  })
  @ApiResponse({ status: 200, description: 'Review moderated successfully' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async moderate(
    @Param('id') id: string,
    @CurrentUser('userId') adminId: string,
    @Body() moderateDto: ModerateReviewDto,
  ) {
    return this.reviewsService.moderate(id, adminId, moderateDto);
  }
}

@ApiTags('Courses')
@Controller('courses')
export class CourseReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get(':courseId/reviews')
  @Public()
  @ApiOperation({
    summary: 'Get course reviews',
    description: 'Get all approved reviews for a specific course',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Course reviews retrieved' })
  async getCourseReviews(
    @Param('courseId') courseId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return this.reviewsService.findAll(courseId, page, limit);
  }

  @Get(':courseId/reviews/stats')
  @Public()
  @ApiOperation({
    summary: 'Get course review statistics',
    description: 'Get average rating and rating distribution for a course',
  })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getCourseReviewStats(@Param('courseId') courseId: string) {
    return this.reviewsService.getCourseStats(courseId);
  }
}
