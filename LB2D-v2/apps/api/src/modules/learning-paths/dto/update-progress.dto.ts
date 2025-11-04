import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max } from 'class-validator';

export class UpdateProgressDto {
  @ApiProperty({ description: 'Current step index (0-based)', example: 1 })
  @IsInt()
  @Min(0)
  currentStepIndex: number;

  @ApiProperty({ description: 'Overall progress percentage', example: 33.5 })
  @IsInt()
  @Min(0)
  @Max(100)
  progress: number;
}
