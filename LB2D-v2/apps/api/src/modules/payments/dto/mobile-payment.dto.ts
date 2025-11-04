import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

export class MobilePaymentDto {
  @ApiProperty({
    example: 'payment_cuid123',
    description: 'Payment ID from create payment intent',
  })
  @IsString()
  @IsNotEmpty()
  paymentId: string;

  @ApiProperty({
    example: 'BKASH',
    description: 'Mobile banking provider',
    enum: ['BKASH', 'NAGAD', 'ROCKET'],
  })
  @IsEnum(['BKASH', 'NAGAD', 'ROCKET'])
  provider: 'BKASH' | 'NAGAD' | 'ROCKET';

  @ApiProperty({
    example: '+8801712345678',
    description: 'Mobile number',
  })
  @IsString()
  @IsNotEmpty()
  mobileNumber: string;

  @ApiProperty({
    example: 'TRX123456789',
    description: 'Transaction ID from mobile banking',
  })
  @IsString()
  @IsNotEmpty()
  transactionId: string;
}
