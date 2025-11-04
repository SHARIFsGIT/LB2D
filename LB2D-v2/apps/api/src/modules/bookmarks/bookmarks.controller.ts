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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { BookmarksService } from './bookmarks.service';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Bookmarks')
@Controller('bookmarks')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Post()
  @ApiOperation({
    summary: 'Create bookmark',
    description: 'Bookmark a course, video, or discussion topic',
  })
  @ApiResponse({ status: 201, description: 'Bookmark created' })
  @ApiResponse({ status: 400, description: 'Already bookmarked or invalid entity' })
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateBookmarkDto,
  ) {
    return this.bookmarksService.createBookmark(userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get bookmarks',
    description: 'Get all user bookmarks with optional filtering',
  })
  @ApiQuery({ name: 'collection', required: false, type: String })
  @ApiQuery({ name: 'tags', required: false, type: String, description: 'Comma-separated tags' })
  @ApiResponse({ status: 200, description: 'Bookmarks retrieved' })
  findAll(
    @CurrentUser('userId') userId: string,
    @Query('collection') collection?: string,
    @Query('tags') tags?: string,
  ) {
    const tagArray = tags ? tags.split(',') : undefined;
    return this.bookmarksService.findAll(userId, collection, tagArray);
  }

  @Get('collections')
  @ApiOperation({
    summary: 'Get collections',
    description: 'Get list of user bookmark collections',
  })
  @ApiResponse({ status: 200, description: 'Collections retrieved' })
  getCollections(@CurrentUser('userId') userId: string) {
    return this.bookmarksService.getCollections(userId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Remove bookmark',
    description: 'Remove a bookmark',
  })
  @ApiResponse({ status: 200, description: 'Bookmark removed' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  remove(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.bookmarksService.remove(id, userId);
  }
}

@ApiTags('Video Notes')
@Controller('notes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class VideoNotesController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Post()
  @ApiOperation({
    summary: 'Create video note',
    description: 'Create a timestamped note on a video',
  })
  @ApiResponse({ status: 201, description: 'Note created' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateNoteDto,
  ) {
    return this.bookmarksService.createNote(userId, dto);
  }

  @Get('video/:videoId')
  @ApiOperation({
    summary: 'Get video notes',
    description: 'Get all notes for a specific video',
  })
  @ApiResponse({ status: 200, description: 'Notes retrieved' })
  findVideoNotes(
    @CurrentUser('userId') userId: string,
    @Param('videoId') videoId: string,
  ) {
    return this.bookmarksService.findVideoNotes(userId, videoId);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update note',
    description: 'Update a video note',
  })
  @ApiResponse({ status: 200, description: 'Note updated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  update(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.bookmarksService.updateNote(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete note',
    description: 'Delete a video note',
  })
  @ApiResponse({ status: 200, description: 'Note deleted' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  remove(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.bookmarksService.removeNote(id, userId);
  }
}
