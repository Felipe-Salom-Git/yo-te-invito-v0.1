import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private resend: Resend | null = null;

  constructor() {
    const key = process.env.RESEND_API_KEY;
    if (key) {
      this.resend = new Resend(key);
    }
  }

  async send(options: SendEmailOptions): Promise<boolean> {
    if (!this.resend) return false;
    const from = process.env.EMAIL_FROM ?? 'noreply@yoteinvito.com';
    try {
      await this.resend.emails.send({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      return true;
    } catch {
      return false;
    }
  }

  isConfigured(): boolean {
    return !!this.resend;
  }
}
