import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Quizzes')
@Controller('quizzes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post()
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create quiz (Supervisor/Admin)',
    description: 'Create a new quiz with questions',
  })
  @ApiResponse({ status: 201, description: 'Quiz created successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async create(@Body() createQuizDto: CreateQuizDto) {
    return this.quizzesService.create(createQuizDto);
  }

  @Get('course/:courseId')
  @ApiOperation({
    summary: 'Get quizzes by course',
    description: 'Get all quizzes for a specific course',
  })
  @ApiResponse({ status: 200, description: 'Quizzes retrieved successfully' })
  async getQuizzesByCourse(@Param('courseId') courseId: string) {
    return this.quizzesService.findByCourse(courseId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get quiz by ID',
    description: 'Get quiz details with questions (without answers)',
  })
  @ApiResponse({ status: 200, description: 'Quiz retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.quizzesService.findOne(id, userId);
  }

  @Post(':id/submit')
  @ApiOperation({
    summary: 'Submit quiz attempt',
    description: 'Submit answers and get results',
  })
  @ApiResponse({ status: 201, description: 'Quiz submitted successfully' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  @ApiResponse({ status: 400, description: 'Max attempts reached or not enrolled' })
  async submitQuiz(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() submitQuizDto: SubmitQuizDto,
  ) {
    return this.quizzesService.submitQuiz(id, userId, submitQuizDto);
  }

  @Get(':id/my-attempts')
  @ApiOperation({
    summary: 'Get my quiz attempts',
    description: 'Get all attempts for this quiz by current user',
  })
  @ApiResponse({ status: 200, description: 'Attempts retrieved successfully' })
  async getMyAttempts(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.quizzesService.getMyAttempts(userId, id);
  }

  @Get('attempts/:attemptId/results')
  @ApiOperation({
    summary: 'Get attempt results',
    description: 'Get detailed results for a quiz attempt',
  })
  @ApiResponse({ status: 200, description: 'Results retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Attempt not found' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async getAttemptResults(
    @Param('attemptId') attemptId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.quizzesService.getAttemptResults(attemptId, userId);
  }

  @Put(':id')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update quiz (Supervisor/Admin)',
    description: 'Update quiz details and questions',
  })
  @ApiResponse({ status: 200, description: 'Quiz updated successfully' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async update(
    @Param('id') id: string,
    @Body() updateQuizDto: UpdateQuizDto,
  ) {
    return this.quizzesService.update(id, updateQuizDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Delete quiz (Supervisor/Admin)',
    description: 'Delete quiz and all attempts',
  })
  @ApiResponse({ status: 200, description: 'Quiz deleted successfully' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async remove(@Param('id') id: string) {
    return this.quizzesService.remove(id);
  }
}
