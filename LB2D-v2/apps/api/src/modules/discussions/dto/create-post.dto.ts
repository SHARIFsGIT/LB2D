import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePostDto {
  @ApiProperty({ description: 'Post content', example: 'I recommend practicing with native speakers...' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({ description: 'Parent post ID for replies', required: false })
  @IsOptional()
  @IsString()
  parentId?: string;
}
