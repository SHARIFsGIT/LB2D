import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, IsOptional } from 'class-validator';

export class ApproveVideoDto {
  @ApiProperty({
    example: true,
    description: 'Approve or reject the video',
  })
  @IsBoolean()
  approve: boolean;

  @ApiProperty({
    example: 'Poor video quality',
    description: 'Rejection reason (required if approve is false)',
    required: false,
  })
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
