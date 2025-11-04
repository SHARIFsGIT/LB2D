import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsInt, IsBoolean, IsOptional } from 'class-validator';

enum AchievementCategory {
  LEARNING = 'LEARNING',
  ENGAGEMENT = 'ENGAGEMENT',
  SOCIAL = 'SOCIAL',
  MILESTONE = 'MILESTONE',
  SPECIAL = 'SPECIAL',
}

enum AchievementType {
  COURSES_COMPLETED = 'COURSES_COMPLETED',
  VIDEOS_WATCHED = 'VIDEOS_WATCHED',
  QUIZZES_PASSED = 'QUIZZES_PASSED',
  DAYS_STREAK = 'DAYS_STREAK',
  HOURS_LEARNED = 'HOURS_LEARNED',
  CERTIFICATES_EARNED = 'CERTIFICATES_EARNED',
  DISCUSSIONS_POSTED = 'DISCUSSIONS_POSTED',
  HELPFUL_ANSWERS = 'HELPFUL_ANSWERS',
  COURSE_REVIEWS = 'COURSE_REVIEWS',
  PERFECT_SCORES = 'PERFECT_SCORES',
}

enum AchievementRarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
}

export class CreateAchievementDto {
  @ApiProperty({ description: 'Achievement name', example: 'First Steps' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Description', example: 'Watch your first video' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ description: 'Icon (emoji or identifier)', example: '🎬' })
  @IsNotEmpty()
  @IsString()
  icon: string;

  @ApiProperty({ description: 'Badge image URL', required: false })
  @IsOptional()
  @IsString()
  badgeUrl?: string;

  @ApiProperty({ description: 'Category', enum: AchievementCategory })
  @IsEnum(AchievementCategory)
  category: AchievementCategory;

  @ApiProperty({ description: 'Type', enum: AchievementType })
  @IsEnum(AchievementType)
  type: AchievementType;

  @ApiProperty({ description: 'Requirement to unlock', example: 1 })
  @IsInt()
  requirement: number;

  @ApiProperty({ description: 'Points awarded', example: 10 })
  @IsInt()
  points: number;

  @ApiProperty({ description: 'Rarity', enum: AchievementRarity })
  @IsEnum(AchievementRarity)
  rarity: AchievementRarity;

  @ApiProperty({ description: 'Is active', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
