import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, IsBoolean } from 'class-validator';

export class UpdateNoteDto {
  @ApiProperty({ description: 'Note content', required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ description: 'Timestamp', required: false })
  @IsOptional()
  @IsInt()
  timestamp?: number;

  @ApiProperty({ description: 'Privacy setting', required: false })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}
