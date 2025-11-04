import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsInt, Min, IsBoolean, IsOptional } from 'class-validator';

export class CreateNoteDto {
  @ApiProperty({ description: 'Video ID', example: 'clx123' })
  @IsNotEmpty()
  @IsString()
  videoId: string;

  @ApiProperty({ description: 'Timestamp in seconds', example: 120 })
  @IsInt()
  @Min(0)
  timestamp: number;

  @ApiProperty({ description: 'Note content', example: 'Important point about verb conjugation' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({ description: 'Is this note private?', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}
