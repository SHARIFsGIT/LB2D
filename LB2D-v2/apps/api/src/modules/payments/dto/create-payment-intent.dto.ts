import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentIntentDto {
  @ApiProperty({
    example: 'cuid123',
    description: 'Course ID to purchase',
  })
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @ApiProperty({
    example: 'STRIPE',
    description: 'Payment method',
    enum: PaymentMethod,
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({
    example: '+8801712345678',
    description: 'Mobile number (for mobile banking)',
    required: false,
  })
  @IsString()
  @IsOptional()
  mobileNumber?: string;
}
