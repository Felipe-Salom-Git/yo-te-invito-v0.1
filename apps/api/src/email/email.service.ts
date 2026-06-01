import { Injectable, Logger } from '@nestjs/common';
import { resolveMailFrom, resolveMailOperationsTo, resolveMailReplyTo } from './mail-config';
import { createMailProvider } from './providers/create-mail-provider';
import type { MailProvider } from './providers/mail-provider.interface';
import type { SendEmailOptions } from './send-email-options';
import { renderEmailTemplate } from './templates/email-template.renderer';
import type { SendTemplateEmailOptions } from './templates/email-template.types';

export type { SendEmailOptions } from './send-email-options';
export type { EmailTemplateId, SendTemplateEmailOptions } from './templates/email-template.types';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly provider: MailProvider;

  constructor() {
    this.provider = createMailProvider();
    if (!this.provider.isConfigured()) {
      this.logger.warn(
        `Mail provider "${this.provider.name}" is not configured — outbound email will be skipped`,
      );
    }
  }

  async send(options: SendEmailOptions): Promise<boolean> {
    const result = await this.provider.send(options);
    if (!result.ok) {
      this.logger.debug(
        `Email send failed: provider=${this.provider.name} code=${result.errorCode} to=${options.to}`,
      );
    }
    return result.ok;
  }

  async sendTemplate(options: SendTemplateEmailOptions): Promise<boolean> {
    const rendered = renderEmailTemplate({
      templateId: options.templateId,
      variables: options.variables,
    });

    const isAdminOperational = options.templateId.startsWith('ADMIN_');
    const to =
      options.to?.trim() ||
      (isAdminOperational ? resolveMailOperationsTo() : undefined);

    if (!to) {
      this.logger.warn(
        `sendTemplate ${options.templateId}: missing recipient (provide to or MAIL_OPERATIONS_TO)`,
      );
      return false;
    }

    return this.send({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      from: options.from ?? resolveMailFrom(),
      replyTo: options.replyTo ?? resolveMailReplyTo(),
    });
  }

  isConfigured(): boolean {
    return this.provider.isConfigured();
  }

  /** For diagnostics / smoke tests. */
  getProviderName(): string {
    return this.provider.name;
  }
}
