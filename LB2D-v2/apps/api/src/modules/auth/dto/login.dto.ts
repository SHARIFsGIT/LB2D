import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'User password',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  // Device information for session management
  @ApiProperty({
    example: 'Chrome on Windows',
    description: 'Device name/identifier',
    required: false,
  })
  @IsString()
  deviceName?: string;

  @ApiProperty({
    example: 'unique-device-fingerprint',
    description: 'Device fingerprint for device recognition',
    required: false,
  })
  @IsString()
  fingerprint?: string;
}
