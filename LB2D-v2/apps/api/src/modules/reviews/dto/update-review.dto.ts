import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateReviewDto {
  @ApiProperty({ description: 'Rating (1-5 stars)', example: 5, minimum: 1, maximum: 5, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiProperty({ description: 'Review title', example: 'Excellent course!', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Review content', example: 'This course helped me...', required: false })
  @IsOptional()
  @IsString()
  content?: string;
}
