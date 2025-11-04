import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';

export class CreateBookmarkDto {
  @ApiProperty({ description: 'Course ID (optional)', example: 'clx123', required: false })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiProperty({ description: 'Video ID (optional)', example: 'clx456', required: false })
  @IsOptional()
  @IsString()
  videoId?: string;

  @ApiProperty({ description: 'Topic ID (optional)', example: 'clx789', required: false })
  @IsOptional()
  @IsString()
  topicId?: string;

  @ApiProperty({ description: 'Optional note', example: 'Important for exam', required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ description: 'Collection name', example: 'German Grammar', required: false })
  @IsOptional()
  @IsString()
  collection?: string;

  @ApiProperty({ description: 'Tags for organization', example: ['grammar', 'important'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
