import { createTransport } from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { resolveMailFrom, resolveMailReplyTo } from '../mail-config';
import type { SendEmailOptions, SendEmailResult } from '../send-email-options';
import type { MailProvider } from './mail-provider.interface';

function parseSmtpSecure(): boolean {
  const raw = process.env.SMTP_SECURE?.trim().toLowerCase();
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  const port = Number(process.env.SMTP_PORT ?? 465);
  return port === 465;
}

export class SmtpMailProvider implements MailProvider {
  readonly name = 'smtp' as const;
  private readonly transporter: Transporter | null;

  constructor() {
    const host = process.env.SMTP_HOST?.trim();
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASSWORD;

    if (!host || !user || !pass) {
      this.transporter = null;
      return;
    }

    const port = Number(process.env.SMTP_PORT ?? 465);
    const secure = parseSmtpSecure();

    this.transporter = createTransport({
      host,
      port: Number.isFinite(port) ? port : 465,
      secure,
      auth: { user, pass },
    });
  }

  isConfigured(): boolean {
    return this.transporter != null;
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.transporter) {
      return { ok: false, errorCode: 'SMTP_NOT_CONFIGURED', retryable: false };
    }

    const from = options.from ?? resolveMailFrom();
    const replyTo = options.replyTo ?? resolveMailReplyTo();

    try {
      const info = await this.transporter.sendMail({
        from,
        to: options.to,
        ...(replyTo ? { replyTo } : {}),
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      return { ok: true, providerMessageId: info.messageId };
    } catch {
      return { ok: false, errorCode: 'SMTP_SEND_FAILED', retryable: true };
    }
  }
}
