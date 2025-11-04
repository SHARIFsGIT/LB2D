import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, IsOptional } from 'class-validator';

export class ApproveResourceDto {
  @ApiProperty({
    example: true,
    description: 'Approve or reject the resource',
  })
  @IsBoolean()
  approve: boolean;

  @ApiProperty({
    example: 'Inappropriate content',
    description: 'Rejection reason (required if approve is false)',
    required: false,
  })
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
