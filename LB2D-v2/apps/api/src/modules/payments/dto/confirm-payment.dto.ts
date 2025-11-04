import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ConfirmPaymentDto {
  @ApiProperty({
    example: 'payment_intent_123',
    description: 'Payment intent ID from Stripe',
  })
  @IsString()
  @IsNotEmpty()
  paymentIntentId: string;
}
