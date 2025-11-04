import {
  Controller,
  Get,
  Post,
  Delete,
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
import { SocialService } from './social.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Social - Follow')
@Controller('social/follow')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FollowController {
  constructor(private readonly socialService: SocialService) {}

  @Post(':userId')
  @ApiOperation({
    summary: 'Follow user',
    description: 'Follow another user',
  })
  @ApiResponse({ status: 201, description: 'Now following user' })
  @ApiResponse({ status: 400, description: 'Already following or invalid user' })
  follow(
    @Param('userId') followingId: string,
    @CurrentUser('userId') followerId: string,
  ) {
    return this.socialService.follow(followerId, followingId);
  }

  @Delete(':userId')
  @ApiOperation({
    summary: 'Unfollow user',
    description: 'Stop following a user',
  })
  @ApiResponse({ status: 200, description: 'Unfollowed user' })
  @ApiResponse({ status: 404, description: 'Not following this user' })
  unfollow(
    @Param('userId') followingId: string,
    @CurrentUser('userId') followerId: string,
  ) {
    return this.socialService.unfollow(followerId, followingId);
  }

  @Get('followers')
  @ApiOperation({
    summary: 'Get my followers',
    description: 'Get list of users following me',
  })
  @ApiResponse({ status: 200, description: 'Followers retrieved' })
  getMyFollowers(@CurrentUser('userId') userId: string) {
    return this.socialService.getFollowers(userId);
  }

  @Get('following')
  @ApiOperation({
    summary: 'Get who I follow',
    description: 'Get list of users I am following',
  })
  @ApiResponse({ status: 200, description: 'Following list retrieved' })
  getMyFollowing(@CurrentUser('userId') userId: string) {
    return this.socialService.getFollowing(userId);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get follow stats',
    description: 'Get followers and following counts',
  })
  @ApiResponse({ status: 200, description: 'Stats retrieved' })
  getStats(@CurrentUser('userId') userId: string) {
    return this.socialService.getFollowStats(userId);
  }

  @Get(':userId/is-following')
  @ApiOperation({
    summary: 'Check if following',
    description: 'Check if current user is following another user',
  })
  @ApiResponse({ status: 200, description: 'Follow status retrieved' })
  isFollowing(
    @Param('userId') followingId: string,
    @CurrentUser('userId') followerId: string,
  ) {
    return this.socialService.isFollowing(followerId, followingId);
  }
}

@ApiTags('Social - Activity Feed')
@Controller('social/activity')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ActivityController {
  constructor(private readonly socialService: SocialService) {}

  @Get('feed')
  @ApiOperation({
    summary: 'Get activity feed',
    description: 'Get activity feed from users you follow',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Feed retrieved' })
  getFeed(
    @CurrentUser('userId') userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.socialService.getActivityFeed(userId, page, limit);
  }

  @Get('my-activity')
  @ApiOperation({
    summary: 'Get my activity',
    description: 'Get my activity history',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Activity retrieved' })
  getMyActivity(
    @CurrentUser('userId') userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.socialService.getMyActivity(userId, page, limit);
  }
}

@ApiTags('Social - Public Profiles')
@Controller('users')
export class PublicProfileController {
  constructor(private readonly socialService: SocialService) {}

  @Get(':userId/public-profile')
  @Public()
  @ApiOperation({
    summary: 'Get public profile',
    description: 'Get public profile information for a user',
  })
  @ApiResponse({ status: 200, description: 'Profile retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getPublicProfile(@Param('userId') userId: string) {
    return this.socialService.getPublicProfile(userId);
  }

  @Get(':userId/followers')
  @Public()
  @ApiOperation({
    summary: 'Get user followers',
    description: 'Get list of users following this user',
  })
  @ApiResponse({ status: 200, description: 'Followers retrieved' })
  getUserFollowers(@Param('userId') userId: string) {
    return this.socialService.getFollowers(userId);
  }

  @Get(':userId/following')
  @Public()
  @ApiOperation({
    summary: 'Get user following',
    description: 'Get list of users this user is following',
  })
  @ApiResponse({ status: 200, description: 'Following list retrieved' })
  getUserFollowing(@Param('userId') userId: string) {
    return this.socialService.getFollowing(userId);
  }
}
