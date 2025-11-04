import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, Max, IsBoolean, IsOptional } from 'class-validator';

export class UpdateVideoProgressDto {
  @ApiProperty({
    example: 45.5,
    description: 'Progress percentage (0-100)',
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  progress: number;

  @ApiProperty({
    example: 273,
    description: 'Current playback time in seconds',
  })
  @IsNumber()
  @Min(0)
  currentTime: number;

  @ApiProperty({
    example: false,
    description: 'Whether video is completed',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  completed?: boolean;
}
