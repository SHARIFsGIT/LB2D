import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RequestRoleChangeDto } from './dto/request-role-change.dto';
import { ApproveRoleChangeDto } from './dto/approve-role-change.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ============================================
  // USER PROFILE ENDPOINTS
  // ============================================

  @Get('profile')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Get authenticated user profile information',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
  })
  async getProfile(@CurrentUser('userId') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Put('profile')
  @ApiOperation({
    summary: 'Update current user profile',
    description: 'Update authenticated user profile (name, phone, photo)',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
  })
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, updateProfileDto);
  }

  // ============================================
  // ROLE CHANGE ENDPOINTS
  // ============================================

  @Put('request-role-change')
  @ApiOperation({
    summary: 'Request role change',
    description: 'Submit a role change request for admin approval',
  })
  @ApiResponse({
    status: 200,
    description: 'Role change request submitted',
  })
  @ApiResponse({
    status: 400,
    description: 'Already have pending request',
  })
  async requestRoleChange(
    @CurrentUser('userId') userId: string,
    @Body() requestRoleChangeDto: RequestRoleChangeDto,
  ) {
    return this.usersService.requestRoleChange(userId, requestRoleChangeDto);
  }

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get all users (Admin only)',
    description: 'Get paginated list of all users with optional role filter',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: UserRole,
    example: 'STUDENT',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
  })
  async getAllUsers(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('role') role?: string,
  ) {
    return this.usersService.getAllUsers(page, limit, role);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get user statistics (Admin only)',
    description: 'Get overall user statistics and breakdown by role',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getUserStats() {
    return this.usersService.getUserStats();
  }

  @Get('pending-role-changes')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get pending role change requests (Admin only)',
    description: 'Get all users with pending role change requests',
  })
  @ApiResponse({
    status: 200,
    description: 'Pending requests retrieved successfully',
  })
  async getPendingRoleChanges() {
    return this.usersService.getPendingRoleChanges();
  }

  @Put(':userId/approve-role-change')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Approve or reject role change (Admin only)',
    description: 'Approve or reject a user role change request',
  })
  @ApiResponse({
    status: 200,
    description: 'Role change processed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async approveRoleChange(
    @Param('userId') userId: string,
    @Body() approveRoleChangeDto: ApproveRoleChangeDto,
  ) {
    return this.usersService.approveRoleChange(userId, approveRoleChangeDto);
  }

  @Get(':userId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get user by ID (Admin only)',
    description: 'Get detailed user information by ID',
  })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getUserById(@Param('userId') userId: string) {
    return this.usersService.getUserById(userId);
  }

  @Put(':userId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update user (Admin only)',
    description: 'Update user information including role and status',
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async updateUser(
    @Param('userId') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(userId, updateUserDto);
  }

  @Delete(':userId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete user (Admin only)',
    description: 'Soft delete user by deactivating account',
  })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async deleteUser(@Param('userId') userId: string) {
    return this.usersService.deleteUser(userId);
  }
}
