import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';

enum TopicType {
  DISCUSSION = 'DISCUSSION',
  QUESTION = 'QUESTION',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  POLL = 'POLL',
}

export class CreateTopicDto {
  @ApiProperty({ description: 'Category slug', example: 'general' })
  @IsNotEmpty()
  @IsString()
  categorySlug: string;

  @ApiProperty({ description: 'Course ID (optional)', example: 'clx123abc', required: false })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiProperty({ description: 'Topic title', example: 'How to practice German pronunciation?' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Topic content', example: 'I am struggling with German pronunciation...' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({ description: 'Topic type', enum: TopicType, example: 'QUESTION' })
  @IsEnum(TopicType)
  type: TopicType;

  @ApiProperty({ description: 'Tags for searchability', example: ['pronunciation', 'beginner'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Meta description for SEO', required: false })
  @IsOptional()
  @IsString()
  metaDescription?: string;
}
