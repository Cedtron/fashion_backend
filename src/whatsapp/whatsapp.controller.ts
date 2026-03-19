import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WhatsappService } from './whatsapp.service';

class SendReportDto {
  to?: string;
  message: string;
}

@ApiTags('whatsapp')
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('send-report')
  @ApiOperation({ summary: 'Send a WhatsApp message (e.g., report) via WhatsApp Cloud API' })
  @ApiResponse({ status: 200, description: 'Message sent' })
  @ApiResponse({ status: 400, description: 'Bad request / missing configuration' })
  async sendReport(@Body() body: SendReportDto) {
    const to = body.to?.toString().trim();
    const message = body.message?.toString().trim();

    if (!to) {
      throw new Error('Recipient phone number is required');
    }

    if (!message) {
      throw new Error('Message is required');
    }

    return this.whatsappService.sendText(to, message);
  }
}
