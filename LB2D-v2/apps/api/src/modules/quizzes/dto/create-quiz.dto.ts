import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType } from '@prisma/client';

export class QuizQuestionDto {
  @ApiProperty({
    example: 'What is the German word for "Hello"?',
    description: 'Question text',
  })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({
    example: 'MULTIPLE_CHOICE',
    description: 'Question type',
    enum: QuestionType,
  })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty({
    example: ['Hallo', 'Tschüss', 'Danke', 'Bitte'],
    description: 'Answer options (for multiple choice)',
    isArray: true,
  })
  @IsArray()
  options: string[];

  @ApiProperty({
    example: 'Hallo',
    description: 'Correct answer(s)',
  })
  correctAnswer: any;

  @ApiProperty({
    example: 'Hallo is the German greeting equivalent to Hello in English.',
    description: 'Explanation for the answer',
    required: false,
  })
  @IsString()
  @IsOptional()
  explanation?: string;

  @ApiProperty({
    example: 1,
    description: 'Points for this question',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  points?: number;

  @ApiProperty({
    example: 1,
    description: 'Question order',
  })
  @IsNumber()
  @Min(1)
  order: number;
}

export class CreateQuizDto {
  @ApiProperty({
    example: 'cuid123',
    description: 'Course ID',
  })
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @ApiProperty({
    example: 'German A1 - Grammar Quiz',
    description: 'Quiz title',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Test your understanding of basic German grammar',
    description: 'Quiz description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 30,
    description: 'Duration in minutes (null for unlimited)',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  duration?: number;

  @ApiProperty({
    example: 70,
    description: 'Passing score percentage',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  passingScore?: number;

  @ApiProperty({
    example: 3,
    description: 'Maximum attempts (null for unlimited)',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxAttempts?: number;

  @ApiProperty({
    example: 1,
    description: 'Quiz order in course',
  })
  @IsNumber()
  @Min(1)
  order: number;

  @ApiProperty({
    example: true,
    description: 'Is quiz active',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'Array of questions',
    type: [QuizQuestionDto],
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions: QuizQuestionDto[];
}
