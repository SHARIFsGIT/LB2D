import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class FollowDto {
  @ApiProperty({ description: 'User ID to follow', example: 'clx123' })
  @IsNotEmpty()
  @IsString()
  userId: string;
}
