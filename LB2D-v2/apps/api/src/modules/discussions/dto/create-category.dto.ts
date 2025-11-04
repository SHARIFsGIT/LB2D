import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category name', example: 'General Discussion' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Category description', example: 'General topics about learning German', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'URL-friendly slug', example: 'general', required: false })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ description: 'Icon (emoji or identifier)', example: '💬', required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: 'Display order', example: 1, required: false })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiProperty({ description: 'Color for UI theming', example: '#10b981', required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ description: 'Require approval for new topics', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;
}
