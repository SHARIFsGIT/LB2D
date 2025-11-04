import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  ParseIntPipe,
  Req,
  RawBodyRequest,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { MobilePaymentDto } from './dto/mobile-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-intent')
  @ApiOperation({
    summary: 'Create payment intent',
    description: 'Create payment intent for course purchase',
  })
  @ApiResponse({ status: 201, description: 'Payment intent created' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 400, description: 'Already enrolled or invalid method' })
  async createPaymentIntent(
    @CurrentUser('userId') userId: string,
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
  ) {
    return this.paymentsService.createPaymentIntent(userId, createPaymentIntentDto);
  }

  @Post('confirm')
  @ApiOperation({
    summary: 'Confirm Stripe payment',
    description: 'Confirm successful Stripe payment and activate enrollment',
  })
  @ApiResponse({ status: 200, description: 'Payment confirmed' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiResponse({ status: 400, description: 'Payment not completed' })
  async confirmPayment(@Body() confirmPaymentDto: ConfirmPaymentDto) {
    return this.paymentsService.confirmPayment(confirmPaymentDto);
  }

  @Post('mobile/confirm')
  @ApiOperation({
    summary: 'Confirm mobile banking payment',
    description: 'Submit mobile banking transaction for verification',
  })
  @ApiResponse({ status: 200, description: 'Payment submitted for verification' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async confirmMobilePayment(@Body() mobilePaymentDto: MobilePaymentDto) {
    return this.paymentsService.confirmMobilePayment(mobilePaymentDto);
  }

  @Get('my-payments')
  @ApiOperation({
    summary: 'Get my payment history',
    description: 'Get all payments made by current user',
  })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  async getMyPayments(@CurrentUser('userId') userId: string) {
    return this.paymentsService.getMyPayments(userId);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get all payments (Admin)',
    description: 'Get paginated list of all payments',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'COMPLETED', 'FAILED'] })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  async getAllPayments(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('status') status?: string,
  ) {
    return this.paymentsService.getAllPayments(page, limit, status);
  }

  @Post('webhook')
  @Public()
  @ApiOperation({
    summary: 'Stripe webhook',
    description: 'Handle Stripe webhook events',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleWebhook(@Req() req: RawBodyRequest<Request>) {
    // TODO: Verify Stripe signature
    // const sig = req.headers['stripe-signature'];
    // const event = this.stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);

    const event = req.body;
    return this.paymentsService.handleWebhook(event);
  }
}
