import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class EnrollCourseDto {
  @ApiProperty({
    example: 'cuid123',
    description: 'Course ID to enroll in',
  })
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @ApiProperty({
    example: 'payment_intent_123',
    description: 'Payment intent ID (for paid courses)',
    required: false,
  })
  @IsString()
  @IsOptional()
  paymentIntentId?: string;
}
