import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsInt, IsBoolean, IsOptional } from 'class-validator';

export class AddStepDto {
  @ApiProperty({ description: 'Course ID', example: 'clx123abc' })
  @IsNotEmpty()
  @IsString()
  courseId: string;

  @ApiProperty({ description: 'Order in the path', example: 1 })
  @IsInt()
  order: number;

  @ApiProperty({ description: 'Is this step optional?', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @ApiProperty({ description: 'Step description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Estimated hours for this step', example: 40, required: false })
  @IsOptional()
  @IsInt()
  estimatedHours?: number;
}
