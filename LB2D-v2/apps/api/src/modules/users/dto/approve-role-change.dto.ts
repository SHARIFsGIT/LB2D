import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, IsOptional } from 'class-validator';

export class ApproveRoleChangeDto {
  @ApiProperty({
    example: true,
    description: 'Approve or reject the role change request',
  })
  @IsBoolean()
  approve: boolean;

  @ApiProperty({
    example: 'Insufficient qualifications',
    description: 'Rejection reason (required if approve is false)',
    required: false,
  })
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
