import { Resend } from 'resend';
import { resolveMailFrom, resolveMailReplyTo } from '../mail-config';
import type { SendEmailOptions, SendEmailResult } from '../send-email-options';
import type { MailProvider } from './mail-provider.interface';

export class ResendMailProvider implements MailProvider {
  readonly name = 'resend' as const;
  private readonly resend: Resend | null;

  constructor() {
    const key = process.env.RESEND_API_KEY?.trim();
    this.resend = key ? new Resend(key) : null;
  }

  isConfigured(): boolean {
    return this.resend != null;
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.resend) {
      return { ok: false, errorCode: 'RESEND_NOT_CONFIGURED', retryable: false };
    }

    const from = options.from ?? resolveMailFrom();
    const replyTo = options.replyTo ?? resolveMailReplyTo();

    try {
      const { data, error } = await this.resend.emails.send({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        ...(replyTo ? { replyTo } : {}),
      });

      if (error) {
        return { ok: false, errorCode: 'RESEND_SEND_FAILED', retryable: true };
      }

      return { ok: true, providerMessageId: data?.id };
    } catch {
      return { ok: false, errorCode: 'RESEND_SEND_FAILED', retryable: true };
    }
  }
}
