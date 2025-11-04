import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    example: 'Great explanation! Very helpful.',
    description: 'Comment content',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @ApiProperty({
    example: 'cuid123',
    description: 'Parent comment ID for replies',
    required: false,
  })
  @IsString()
  @IsOptional()
  parentId?: string;
}
