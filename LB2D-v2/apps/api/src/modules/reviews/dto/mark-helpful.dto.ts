import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class MarkHelpfulDto {
  @ApiProperty({ description: 'Is this review helpful?', example: true })
  @IsNotEmpty()
  @IsBoolean()
  isHelpful: boolean;
}
