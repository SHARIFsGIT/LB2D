import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { SendContactMessageDto } from './dto/send-contact-message.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Public()
  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send contact message',
    description: 'Allows anyone to send a contact message to the LB2D team',
  })
  @ApiResponse({
    status: 200,
    description: 'Message sent successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Message sent successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            sentAt: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async sendContactMessage(@Body() dto: SendContactMessageDto) {
    const result = await this.contactService.sendContactMessage(dto);
    return {
      success: true,
      message: 'Your message has been sent successfully! We will get back to you soon.',
      data: result,
    };
  }
}
