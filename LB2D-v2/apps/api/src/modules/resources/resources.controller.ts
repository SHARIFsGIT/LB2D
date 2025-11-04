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
  UploadedFile,
  Query,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ApproveResourceDto } from './dto/approve-resource.dto';
import { MarkProgressDto } from './dto/mark-progress.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Resources')
@Controller('resources')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Post('upload')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload resource (Supervisor)',
    description: 'Upload course resource file (PDF, DOC, PPT, etc.)',
  })
  @ApiResponse({ status: 201, description: 'Resource uploaded successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async uploadResource(
    @Body() createResourceDto: CreateResourceDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.resourcesService.create(createResourceDto, file);
  }

  @Get('course/:courseId')
  @ApiOperation({
    summary: 'Get resources by course',
    description: 'Get all resources for a specific course',
  })
  @ApiResponse({ status: 200, description: 'Resources retrieved successfully' })
  async getResourcesByCourse(
    @Param('courseId') courseId: string,
    @CurrentUser('userId') userId: string,
    @Query('includeAll') includeAll?: boolean,
  ) {
    return this.resourcesService.findByCourse(courseId, userId, includeAll);
  }

  @Get('pending')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get pending resources (Admin)',
    description: 'Get all resources awaiting approval',
  })
  @ApiResponse({ status: 200, description: 'Pending resources retrieved' })
  async getPendingResources() {
    return this.resourcesService.getPendingResources();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get resource by ID',
    description: 'Get resource details with user progress',
  })
  @ApiResponse({ status: 200, description: 'Resource retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.resourcesService.findOne(id, userId);
  }

  @Put(':id')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update resource (Supervisor/Admin)',
    description: 'Update resource details',
  })
  @ApiResponse({ status: 200, description: 'Resource updated successfully' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async update(
    @Param('id') id: string,
    @Body() updateResourceDto: UpdateResourceDto,
  ) {
    return this.resourcesService.update(id, updateResourceDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Delete resource (Supervisor/Admin)',
    description: 'Delete resource and associated file',
  })
  @ApiResponse({ status: 200, description: 'Resource deleted successfully' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async remove(@Param('id') id: string) {
    return this.resourcesService.remove(id);
  }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Approve/reject resource (Admin)',
    description: 'Approve or reject pending resource',
  })
  @ApiResponse({ status: 200, description: 'Resource approval processed' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async approveResource(
    @Param('id') id: string,
    @Body() approveResourceDto: ApproveResourceDto,
    @CurrentUser('userId') adminId: string,
  ) {
    return this.resourcesService.approveResource(id, approveResourceDto, adminId);
  }

  @Post(':id/progress')
  @ApiOperation({
    summary: 'Mark resource progress',
    description: 'Track resource viewed/downloaded/completed status',
  })
  @ApiResponse({ status: 200, description: 'Progress updated successfully' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async markProgress(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() markProgressDto: MarkProgressDto,
  ) {
    return this.resourcesService.markProgress(id, userId, markProgressDto);
  }
}
