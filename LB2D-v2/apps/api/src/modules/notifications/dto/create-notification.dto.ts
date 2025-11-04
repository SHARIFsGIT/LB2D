import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty({
    example: 'cuid123',
    description: 'User ID to send notification to',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    example: 'COURSE_ENROLLMENT',
    description: 'Notification type',
    enum: NotificationType,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    example: 'Course Enrollment Successful',
    description: 'Notification title',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'You have successfully enrolled in German A1 course',
    description: 'Notification message',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    example: { courseId: 'cuid123', courseName: 'German A1' },
    description: 'Additional data',
    required: false,
  })
  @IsObject()
  @IsOptional()
  data?: any;

  @ApiProperty({
    example: false,
    description: 'Is this notification urgent',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  urgent?: boolean;
}
