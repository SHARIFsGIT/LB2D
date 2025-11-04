import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Query,
  Patch,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { VideosService } from './videos.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { UpdateVideoProgressDto } from './dto/update-video-progress.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ApproveVideoDto } from './dto/approve-video.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Videos')
@Controller('videos')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Post('upload')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'video', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload video (Supervisor)',
    description: 'Upload video file and create video entry',
  })
  @ApiResponse({ status: 201, description: 'Video uploaded successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async uploadVideo(
    @Body() createVideoDto: CreateVideoDto,
    @UploadedFiles()
    files: {
      video?: Express.Multer.File[];
      thumbnail?: Express.Multer.File[];
    },
  ) {
    const videoFile = files?.video?.[0];
    const thumbnailFile = files?.thumbnail?.[0];

    return this.videosService.create(
      createVideoDto,
      videoFile,
      thumbnailFile,
    );
  }

  @Get('course/:courseId')
  @ApiOperation({
    summary: 'Get videos by course',
    description: 'Get all videos for a specific course',
  })
  @ApiResponse({ status: 200, description: 'Videos retrieved successfully' })
  async getVideoByCourse(
    @Param('courseId') courseId: string,
    @CurrentUser('userId') userId: string,
    @Query('includeAll') includeAll?: boolean,
  ) {
    return this.videosService.findByCourse(courseId, userId, includeAll);
  }

  @Get('pending')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get pending videos (Admin)',
    description: 'Get all videos awaiting approval',
  })
  @ApiResponse({ status: 200, description: 'Pending videos retrieved' })
  async getPendingVideos() {
    return this.videosService.getPendingVideos();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get video by ID',
    description: 'Get video details with user progress',
  })
  @ApiResponse({ status: 200, description: 'Video retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.videosService.findOne(id, userId);
  }

  @Put(':id')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update video (Supervisor/Admin)',
    description: 'Update video details',
  })
  @ApiResponse({ status: 200, description: 'Video updated successfully' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async update(
    @Param('id') id: string,
    @Body() updateVideoDto: UpdateVideoDto,
  ) {
    return this.videosService.update(id, updateVideoDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Delete video (Supervisor/Admin)',
    description: 'Delete video and associated files',
  })
  @ApiResponse({ status: 200, description: 'Video deleted successfully' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async remove(@Param('id') id: string) {
    return this.videosService.remove(id);
  }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Approve/reject video (Admin)',
    description: 'Approve or reject pending video',
  })
  @ApiResponse({ status: 200, description: 'Video approval processed' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async approveVideo(
    @Param('id') id: string,
    @Body() approveVideoDto: ApproveVideoDto,
    @CurrentUser('userId') adminId: string,
  ) {
    return this.videosService.approveVideo(id, approveVideoDto, adminId);
  }

  @Post(':id/progress')
  @ApiOperation({
    summary: 'Update video progress',
    description: 'Track user video watching progress',
  })
  @ApiResponse({ status: 200, description: 'Progress updated successfully' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async updateProgress(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() updateProgressDto: UpdateVideoProgressDto,
  ) {
    return this.videosService.updateProgress(id, userId, updateProgressDto);
  }

  // ============================================
  // VIDEO COMMENTS ENDPOINTS
  // ============================================

  @Get(':id/comments')
  @ApiOperation({
    summary: 'Get video comments',
    description: 'Get all comments for a video with nested replies',
  })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully' })
  async getComments(@Param('id') id: string) {
    return this.videosService.getComments(id);
  }

  @Post(':id/comments')
  @ApiOperation({
    summary: 'Add comment to video',
    description: 'Post a new comment or reply to existing comment',
  })
  @ApiResponse({ status: 201, description: 'Comment added successfully' })
  @ApiResponse({ status: 404, description: 'Video or parent comment not found' })
  async addComment(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.videosService.addComment(id, userId, createCommentDto);
  }

  @Put('comments/:commentId')
  @ApiOperation({
    summary: 'Update comment',
    description: 'Update own comment',
  })
  @ApiResponse({ status: 200, description: 'Comment updated successfully' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async updateComment(
    @Param('commentId') commentId: string,
    @CurrentUser('userId') userId: string,
    @Body('content') content: string,
  ) {
    return this.videosService.updateComment(commentId, userId, content);
  }

  @Delete('comments/:commentId')
  @ApiOperation({
    summary: 'Delete comment',
    description: 'Delete own comment or any comment (admin)',
  })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.videosService.deleteComment(commentId, userId, userRole);
  }
}
