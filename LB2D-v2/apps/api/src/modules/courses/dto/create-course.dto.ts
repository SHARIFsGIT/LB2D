import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsEnum,
  IsUrl,
  MaxLength,
  IsArray,
} from 'class-validator';
import { CourseLevel } from '@prisma/client';

export class CreateCourseDto {
  @ApiProperty({
    example: 'German A1 - Beginner Level',
    description: 'Course title',
  })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(200)
  title: string;

  @ApiProperty({
    example: 'Complete beginner course for learning German language...',
    description: 'Course description',
  })
  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  description: string;

  @ApiProperty({
    example: 99.99,
    description: 'Course price in USD',
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    example: 79.99,
    description: 'Discounted price (optional)',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discountPrice?: number;

  @ApiProperty({
    example: 'BEGINNER',
    description: 'Course difficulty level',
    enum: CourseLevel,
  })
  @IsEnum(CourseLevel)
  level: CourseLevel;

  @ApiProperty({
    example: 'https://cdn.lb2d.com/thumbnails/german-a1.jpg',
    description: 'Course thumbnail URL',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiProperty({
    example: 'en',
    description: 'Course language',
    required: false,
  })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiProperty({
    example: 'german-a1-beginner',
    description: 'URL-friendly slug for SEO',
    required: false,
  })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({
    example: 'German A1 Course - Learn German Online | LB2D',
    description: 'SEO meta title',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(60)
  metaTitle?: string;

  @ApiProperty({
    example: 'Start learning German with our comprehensive A1 beginner course...',
    description: 'SEO meta description',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(160)
  metaDescription?: string;

  @ApiProperty({
    example: ['German', 'A1', 'Beginner', 'Language Learning'],
    description: 'SEO keywords',
    required: false,
    isArray: true,
  })
  @IsArray()
  @IsOptional()
  metaKeywords?: string[];
}
