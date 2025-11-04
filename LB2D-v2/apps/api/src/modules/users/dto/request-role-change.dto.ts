import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '@prisma/client';

export class RequestRoleChangeDto {
  @ApiProperty({
    example: 'SUPERVISOR',
    description: 'Requested role',
    enum: ['STUDENT', 'SUPERVISOR'],
  })
  @IsEnum(['STUDENT', 'SUPERVISOR'], {
    message: 'Requested role must be either STUDENT or SUPERVISOR',
  })
  @IsNotEmpty({ message: 'Requested role is required' })
  requestedRole: 'STUDENT' | 'SUPERVISOR';
}
