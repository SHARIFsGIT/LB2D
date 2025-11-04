import { Injectable, Logger } from '@nestjs/common';
import { SendContactMessageDto } from './dto/send-contact-message.dto';
import { EmailService } from '../../common/email/email.service';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(private readonly emailService: EmailService) {}

  /**
   * Send contact message
   * Sends email to admin team and optionally to the sender
   */
  async sendContactMessage(dto: SendContactMessageDto) {
    const sentAt = new Date();

    try {
      // Send email to LB2D admin team
      await this.emailService.sendContactNotification({
        name: dto.name,
        email: dto.email,
        subject: dto.subject,
        message: dto.message,
      });

      // Send confirmation email to sender
      await this.emailService.sendContactConfirmation({
        to: dto.email,
        name: dto.name,
      });

      this.logger.log(
        `Contact message received from ${dto.name} (${dto.email}): ${dto.subject}`,
      );

      return {
        id: `contact_${Date.now()}`,
        sentAt: sentAt.toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to send contact message from ${dto.email}`,
        error,
      );
      throw error;
    }
  }
}
