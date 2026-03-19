import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { request } from 'https';
import { URL } from 'url';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly token: string | undefined;
  private readonly phoneNumberId: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.token = this.configService.get<string>('WHATSAPP_BUSINESS_TOKEN');
    this.phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
  }

  private getConfig() {
    return {
      token: this.token,
      phoneNumberId: this.phoneNumberId,
    };
  }

  async sendText(to: string, message: string) {
    const { token, phoneNumberId } = this.getConfig();

    if (!token || !phoneNumberId) {
      this.logger.warn(
        'WhatsApp Cloud API is not configured. Set WHATSAPP_BUSINESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID to enable sending.',
      );
      return { success: false, message: 'WhatsApp not configured' };
    }

    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: message,
      },
    };

    const url = new URL(`https://graph.facebook.com/v17.0/${this.phoneNumberId}/messages`);
    const body = JSON.stringify(payload);

    const requestOptions = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const result = await new Promise<any>((resolve, reject) => {
      const req = request(url, requestOptions, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = responseData ? JSON.parse(responseData) : {};
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
              return;
            }
            reject(parsed);
          } catch (err) {
            reject(err);
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.write(body);
      req.end();
    });

    this.logger.log(`WhatsApp message sent to ${to}`);
    return result;
  }
}
