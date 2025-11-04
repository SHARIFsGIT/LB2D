import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsInt, IsBoolean, IsArray } from 'class-validator';

enum CourseLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT',
}

export class CreatePathDto {
  @ApiProperty({ description: 'Path title', example: 'Complete German A1-B1 Journey' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Path description', example: 'Master German from beginner to intermediate...' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ description: 'URL slug', example: 'german-a1-b1-complete', required: false })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ description: 'Thumbnail URL', required: false })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiProperty({ description: 'Difficulty level', enum: CourseLevel })
  @IsEnum(CourseLevel)
  level: CourseLevel;

  @ApiProperty({ description: 'Estimated hours to complete', example: 120, required: false })
  @IsOptional()
  @IsInt()
  estimatedHours?: number;

  @ApiProperty({ description: 'Is this an official platform path?', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isOfficial?: boolean;

  @ApiProperty({ description: 'Meta title for SEO', required: false })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiProperty({ description: 'Meta description for SEO', required: false })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiProperty({ description: 'Tags for searchability', example: ['german', 'beginner'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
