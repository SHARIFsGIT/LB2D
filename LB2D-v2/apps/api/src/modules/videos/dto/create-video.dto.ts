import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsUrl,
} from 'class-validator';

export class CreateVideoDto {
  @ApiProperty({
    example: 'cuid123',
    description: 'Course ID',
  })
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @ApiProperty({
    example: 'Introduction to German Alphabet',
    description: 'Video title',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Learn the basics of German alphabet and pronunciation',
    description: 'Video description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 600,
    description: 'Video duration in seconds',
  })
  @IsNumber()
  @Min(1)
  duration: number;

  @ApiProperty({
    example: 1,
    description: 'Order/sequence in course',
  })
  @IsNumber()
  @Min(1)
  order: number;

  @ApiProperty({
    example: 'https://s3.amazonaws.com/lb2d/videos/video.mp4',
    description: 'Video URL (after upload)',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  videoUrl?: string;

  @ApiProperty({
    example: 'https://s3.amazonaws.com/lb2d/thumbnails/thumb.jpg',
    description: 'Thumbnail URL',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  thumbnailUrl?: string;
}
