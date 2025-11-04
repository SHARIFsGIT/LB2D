import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ description: 'Course ID', example: 'clx123abc' })
  @IsNotEmpty()
  @IsString()
  courseId: string;

  @ApiProperty({ description: 'Rating (1-5 stars)', example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ description: 'Review title (optional)', example: 'Excellent course!', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Review content', example: 'This course helped me learn German from scratch...' })
  @IsNotEmpty()
  @IsString()
  content: string;
}
