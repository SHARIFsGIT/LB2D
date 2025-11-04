import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsUrl,
} from 'class-validator';

export class CreateResourceDto {
  @ApiProperty({
    example: 'cuid123',
    description: 'Course ID',
  })
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @ApiProperty({
    example: 'German Grammar Reference Sheet',
    description: 'Resource title',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Comprehensive guide to German grammar rules',
    description: 'Resource description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 1,
    description: 'Order/sequence in course',
  })
  @IsNumber()
  @Min(1)
  order: number;

  @ApiProperty({
    example: 'https://s3.amazonaws.com/lb2d/resources/document.pdf',
    description: 'File URL (after upload)',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  fileUrl?: string;

  @ApiProperty({
    example: 'pdf',
    description: 'File type',
    required: false,
  })
  @IsString()
  @IsOptional()
  fileType?: string;
}
