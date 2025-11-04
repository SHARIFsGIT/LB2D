import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class LogoutDto {
  @ApiProperty({
    example: 'device-id-123',
    description: 'Device ID to logout from (optional - defaults to current device)',
    required: false,
  })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiProperty({
    example: false,
    description: 'Logout from all devices',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  allDevices?: boolean;
}
