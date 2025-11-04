import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create quiz with questions (Supervisor/Admin)
   */
  async create(createQuizDto: CreateQuizDto) {
    // Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id: createQuizDto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Create quiz with questions
    const quiz = await this.prisma.quiz.create({
      data: {
        courseId: createQuizDto.courseId,
        title: createQuizDto.title,
        description: createQuizDto.description,
        duration: createQuizDto.duration,
        passingScore: createQuizDto.passingScore || 70,
        maxAttempts: createQuizDto.maxAttempts,
        order: createQuizDto.order,
        isActive: createQuizDto.isActive ?? true,
        questions: {
          create: createQuizDto.questions.map((q) => ({
            question: q.question,
            type: q.type,
            options: JSON.stringify(q.options),
            correctAnswer: JSON.stringify(q.correctAnswer),
            explanation: q.explanation,
            points: q.points || 1,
            order: q.order,
          })),
        },
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return {
      message: 'Quiz created successfully',
      quiz,
    };
  }

  /**
   * Get all quizzes for a course
   */
  async findByCourse(courseId: string) {
    const quizzes = await this.prisma.quiz.findMany({
      where: { courseId, isActive: true },
      include: {
        _count: {
          select: {
            questions: true,
            attempts: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    return { quizzes };
  }

  /**
   * Get quiz by ID (for taking quiz)
   */
  async findOne(id: string, userId?: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        questions: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            question: true,
            type: true,
            options: true,
            points: true,
            order: true,
            // Don't send correctAnswer or explanation until after submission
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // Get user's attempts if userId provided
    let attempts = [];
    let canAttempt = true;

    if (userId) {
      attempts = await this.prisma.quizAttempt.findMany({
        where: {
          userId,
          quizId: id,
        },
        orderBy: {
          startedAt: 'desc',
        },
        select: {
          id: true,
          score: true,
          passed: true,
          timeSpent: true,
          startedAt: true,
          completedAt: true,
        },
      });

      // Check if max attempts reached
      if (quiz.maxAttempts && attempts.length >= quiz.maxAttempts) {
        canAttempt = false;
      }
    }

    return {
      quiz: {
        ...quiz,
        questions: quiz.questions.map((q) => ({
          ...q,
          options: JSON.parse(q.options as string),
        })),
      },
      attempts,
      canAttempt,
    };
  }

  /**
   * Submit quiz attempt
   */
  async submitQuiz(quizId: string, userId: string, submitQuizDto: SubmitQuizDto) {
    // Get quiz with questions
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: true,
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (!quiz.isActive) {
      throw new BadRequestException('Quiz is not active');
    }

    // Check max attempts
    if (quiz.maxAttempts) {
      const attemptCount = await this.prisma.quizAttempt.count({
        where: {
          userId,
          quizId,
        },
      });

      if (attemptCount >= quiz.maxAttempts) {
        throw new BadRequestException('Maximum attempts reached');
      }
    }

    // Check if user is enrolled in course
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: quiz.courseId,
        },
      },
    });

    if (!enrollment) {
      throw new ForbiddenException('You must be enrolled in the course to take this quiz');
    }

    // Calculate score
    let totalPoints = 0;
    let earnedPoints = 0;
    const results = [];

    for (const question of quiz.questions) {
      totalPoints += question.points;

      const userAnswer = submitQuizDto.answers[question.id];
      const correctAnswer = JSON.parse(question.correctAnswer as string);

      const isCorrect = this.checkAnswer(
        userAnswer,
        correctAnswer,
        question.type,
      );

      if (isCorrect) {
        earnedPoints += question.points;
      }

      results.push({
        questionId: question.id,
        question: question.question,
        userAnswer,
        correctAnswer,
        isCorrect,
        points: question.points,
        earnedPoints: isCorrect ? question.points : 0,
        explanation: question.explanation,
      });
    }

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= quiz.passingScore;

    // Create attempt
    const attempt = await this.prisma.quizAttempt.create({
      data: {
        userId,
        quizId,
        answers: JSON.stringify(submitQuizDto.answers),
        score,
        passed,
        completedAt: new Date(),
      },
    });

    return {
      message: passed
        ? 'Congratulations! You passed the quiz.'
        : `You scored ${score.toFixed(1)}%. Passing score is ${quiz.passingScore}%.`,
      attempt: {
        id: attempt.id,
        score,
        passed,
        completedAt: attempt.completedAt,
      },
      results,
      totalPoints,
      earnedPoints,
    };
  }

  /**
   * Get user's quiz attempts
   */
  async getMyAttempts(userId: string, quizId: string) {
    const attempts = await this.prisma.quizAttempt.findMany({
      where: {
        userId,
        quizId,
      },
      orderBy: {
        startedAt: 'desc',
      },
      select: {
        id: true,
        score: true,
        passed: true,
        timeSpent: true,
        startedAt: true,
        completedAt: true,
      },
    });

    return { attempts };
  }

  /**
   * Get quiz results (detailed)
   */
  async getAttemptResults(attemptId: string, userId: string) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('Quiz attempt not found');
    }

    if (attempt.userId !== userId) {
      throw new ForbiddenException('Not authorized to view this attempt');
    }

    const userAnswers = JSON.parse(attempt.answers as string);
    const results = [];

    for (const question of attempt.quiz.questions) {
      const userAnswer = userAnswers[question.id];
      const correctAnswer = JSON.parse(question.correctAnswer as string);

      const isCorrect = this.checkAnswer(
        userAnswer,
        correctAnswer,
        question.type,
      );

      results.push({
        questionId: question.id,
        question: question.question,
        type: question.type,
        options: JSON.parse(question.options as string),
        userAnswer,
        correctAnswer,
        isCorrect,
        explanation: question.explanation,
        points: question.points,
      });
    }

    return {
      attempt: {
        id: attempt.id,
        score: attempt.score,
        passed: attempt.passed,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
      },
      quiz: {
        id: attempt.quiz.id,
        title: attempt.quiz.title,
        passingScore: attempt.quiz.passingScore,
      },
      results,
    };
  }

  /**
   * Update quiz
   */
  async update(id: string, updateQuizDto: UpdateQuizDto) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // If questions are being updated, delete old ones and create new
    if (updateQuizDto.questions) {
      await this.prisma.quizQuestion.deleteMany({
        where: { quizId: id },
      });
    }

    const updatedQuiz = await this.prisma.quiz.update({
      where: { id },
      data: {
        title: updateQuizDto.title,
        description: updateQuizDto.description,
        duration: updateQuizDto.duration,
        passingScore: updateQuizDto.passingScore,
        maxAttempts: updateQuizDto.maxAttempts,
        order: updateQuizDto.order,
        isActive: updateQuizDto.isActive,
        ...(updateQuizDto.questions && {
          questions: {
            create: updateQuizDto.questions.map((q) => ({
              question: q.question,
              type: q.type,
              options: JSON.stringify(q.options),
              correctAnswer: JSON.stringify(q.correctAnswer),
              explanation: q.explanation,
              points: q.points || 1,
              order: q.order,
            })),
          },
        }),
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return {
      message: 'Quiz updated successfully',
      quiz: updatedQuiz,
    };
  }

  /**
   * Delete quiz
   */
  async remove(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // Delete quiz (cascade will delete questions and attempts)
    await this.prisma.quiz.delete({
      where: { id },
    });

    return {
      message: 'Quiz deleted successfully',
    };
  }

  /**
   * Check if answer is correct
   */
  private checkAnswer(userAnswer: any, correctAnswer: any, type: string): boolean {
    if (type === 'MULTIPLE_CHOICE' || type === 'TRUE_FALSE') {
      return userAnswer === correctAnswer;
    }

    if (type === 'SHORT_ANSWER') {
      return (
        userAnswer?.toString().toLowerCase().trim() ===
        correctAnswer?.toString().toLowerCase().trim()
      );
    }

    // For essay questions, manual grading needed
    return false;
  }
}
