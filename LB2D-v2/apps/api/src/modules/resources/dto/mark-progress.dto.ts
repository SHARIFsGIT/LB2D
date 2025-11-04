import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class MarkProgressDto {
  @ApiProperty({
    example: true,
    description: 'Mark resource as viewed',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  viewed?: boolean;

  @ApiProperty({
    example: true,
    description: 'Mark resource as downloaded',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  downloaded?: boolean;

  @ApiProperty({
    example: true,
    description: 'Mark resource as completed',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  completed?: boolean;
}
