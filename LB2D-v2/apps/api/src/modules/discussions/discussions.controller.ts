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
import { DiscussionsService } from './discussions.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateTopicDto } from './dto/create-topic.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';

// ============================================
// CATEGORIES CONTROLLER
// ============================================

@ApiTags('Discussions - Categories')
@Controller('discussions/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DiscussionCategoriesController {
  constructor(private readonly discussionsService: DiscussionsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create category (Admin)',
    description: 'Create a new discussion category',
  })
  @ApiResponse({ status: 201, description: 'Category created' })
  create(@Body() dto: CreateCategoryDto) {
    return this.discussionsService.createCategory(dto);
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all categories',
    description: 'Get list of all discussion categories',
  })
  @ApiResponse({ status: 200, description: 'Categories retrieved' })
  findAll() {
    return this.discussionsService.findAllCategories();
  }

  @Get(':slug')
  @Public()
  @ApiOperation({
    summary: 'Get category by slug',
    description: 'Get a single category with details',
  })
  @ApiResponse({ status: 200, description: 'Category retrieved' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findOne(@Param('slug') slug: string) {
    return this.discussionsService.findCategory(slug);
  }
}

// ============================================
// TOPICS CONTROLLER
// ============================================

@ApiTags('Discussions - Topics')
@Controller('discussions/topics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DiscussionTopicsController {
  constructor(private readonly discussionsService: DiscussionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create topic',
    description: 'Create a new discussion topic or question',
  })
  @ApiResponse({ status: 201, description: 'Topic created' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateTopicDto,
  ) {
    return this.discussionsService.createTopic(userId, dto);
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all topics',
    description: 'Get paginated list of topics with optional filtering',
  })
  @ApiQuery({ name: 'categorySlug', required: false, type: String })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Topics retrieved' })
  findAll(
    @Query('categorySlug') categorySlug?: string,
    @Query('courseId') courseId?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('search') search?: string,
  ) {
    return this.discussionsService.findAllTopics(
      categorySlug,
      courseId,
      page,
      limit,
      search,
    );
  }

  @Get('search')
  @Public()
  @ApiOperation({
    summary: 'Search topics',
    description: 'Search topics by title, content, or tags',
  })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Search results' })
  search(
    @Query('q') query: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.discussionsService.searchTopics(query, page, limit);
  }

  @Get(':slug')
  @Public()
  @ApiOperation({
    summary: 'Get topic by slug',
    description: 'Get a single topic with full details',
  })
  @ApiResponse({ status: 200, description: 'Topic retrieved' })
  @ApiResponse({ status: 404, description: 'Topic not found' })
  findOne(@Param('slug') slug: string) {
    return this.discussionsService.findTopic(slug);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update topic',
    description: 'Update your own topic or any topic (admin)',
  })
  @ApiResponse({ status: 200, description: 'Topic updated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Topic not found' })
  update(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: UpdateTopicDto,
  ) {
    const isAdmin = role === UserRole.ADMIN;
    return this.discussionsService.updateTopic(id, userId, dto, isAdmin);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete topic',
    description: 'Delete your own topic or any topic (admin)',
  })
  @ApiResponse({ status: 200, description: 'Topic deleted' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Topic not found' })
  remove(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    const isAdmin = role === UserRole.ADMIN;
    return this.discussionsService.deleteTopic(id, userId, isAdmin);
  }

  @Patch(':id/pin')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Pin topic (Admin)',
    description: 'Pin a topic to the top of the list',
  })
  @ApiResponse({ status: 200, description: 'Topic pinned' })
  pin(@Param('id') id: string) {
    return this.discussionsService.pinTopic(id);
  }

  @Patch(':id/lock')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Lock topic (Admin)',
    description: 'Lock a topic to prevent new replies',
  })
  @ApiResponse({ status: 200, description: 'Topic locked' })
  lock(@Param('id') id: string) {
    return this.discussionsService.lockTopic(id);
  }

  @Post(':id/like')
  @ApiOperation({
    summary: 'Like/Unlike topic',
    description: 'Toggle like on a topic',
  })
  @ApiResponse({ status: 200, description: 'Like toggled' })
  likeTopic(
    @Param('id') topicId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.discussionsService.likeTopic(topicId, userId);
  }

  @Post(':id/best-answer')
  @ApiOperation({
    summary: 'Mark best answer',
    description: 'Mark a post as the best answer (topic author only)',
  })
  @ApiResponse({ status: 200, description: 'Best answer marked' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  markBestAnswer(
    @Param('id') topicId: string,
    @Body('postId') postId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.discussionsService.markBestAnswer(topicId, postId, userId);
  }
}

// ============================================
// POSTS CONTROLLER
// ============================================

@ApiTags('Discussions - Posts')
@Controller('discussions/topics/:topicId/posts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DiscussionPostsController {
  constructor(private readonly discussionsService: DiscussionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create post',
    description: 'Create a reply to a topic or another post',
  })
  @ApiResponse({ status: 201, description: 'Post created' })
  @ApiResponse({ status: 404, description: 'Topic not found' })
  create(
    @Param('topicId') topicId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePostDto,
  ) {
    return this.discussionsService.createPost(topicId, userId, dto);
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get topic posts',
    description: 'Get all posts for a topic with nested replies',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Posts retrieved' })
  findAll(
    @Param('topicId') topicId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ) {
    return this.discussionsService.findTopicPosts(topicId, page, limit);
  }
}

@ApiTags('Discussions - Posts')
@Controller('discussions/posts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PostActionsController {
  constructor(private readonly discussionsService: DiscussionsService) {}

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete post',
    description: 'Delete your own post or any post (admin)',
  })
  @ApiResponse({ status: 200, description: 'Post deleted' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  remove(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    const isAdmin = role === UserRole.ADMIN;
    return this.discussionsService.deletePost(id, userId, isAdmin);
  }

  @Post(':id/like')
  @ApiOperation({
    summary: 'Like/Unlike post',
    description: 'Toggle like on a post',
  })
  @ApiResponse({ status: 200, description: 'Like toggled' })
  likePost(
    @Param('id') postId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.discussionsService.likePost(postId, userId);
  }
}
