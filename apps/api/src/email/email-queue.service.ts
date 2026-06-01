/**
 * Email queue using BullMQ + Redis.
 * If REDIS_URL is not set, falls back to sending synchronously via EmailService.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { resolveMailFrom, resolveMailOperationsTo, resolveMailReplyTo } from './mail-config';
import { EmailService } from './email.service';
import type { SendEmailOptions } from './send-email-options';
import { renderEmailTemplate } from './templates/email-template.renderer';
import type { EmailTemplateId } from './templates/email-template.types';
import {
  buildAdminEmailDeliveryFailedVariables,
  isInternalOperationalEmailTemplate,
} from './templates/admin-operational-email.util';

const QUEUE_NAME = 'emails';
const REDIS_URL = process.env.REDIS_URL ?? '';

export interface EmailJobData extends SendEmailOptions {
  /** When set, a failed send may notify operations (except internal ADMIN_* templates). */
  sourceTemplateId?: EmailTemplateId;
}

@Injectable()
export class EmailQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(EmailQueueService.name);
  private queue: Queue<EmailJobData> | null = null;
  private worker: Worker<EmailJobData> | null = null;

  constructor(private readonly email: EmailService) {
    if (REDIS_URL) {
      const connection = { url: REDIS_URL };
      this.queue = new Queue<EmailJobData>(QUEUE_NAME, { connection });
      this.worker = new Worker<EmailJobData>(
        QUEUE_NAME,
        async (job) => {
          await this.dispatchSend(job.data);
        },
        { connection },
      );
    }
  }

  async enqueue(options: EmailJobData): Promise<void> {
    if (this.queue) {
      await this.queue.add('send', options);
    } else {
      await this.dispatchSend(options);
    }
  }

  async enqueueTemplate(params: {
    templateId: EmailTemplateId;
    to: string;
    variables: Record<string, unknown>;
    from?: string;
    replyTo?: string;
  }): Promise<void> {
    const rendered = renderEmailTemplate({
      templateId: params.templateId,
      variables: params.variables,
    });
    await this.enqueue({
      to: params.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      from: params.from ?? resolveMailFrom(),
      replyTo: params.replyTo ?? resolveMailReplyTo(),
      sourceTemplateId: params.templateId,
    });
  }

  private async dispatchSend(data: EmailJobData): Promise<void> {
    const ok = await this.email.send(data);
    if (
      !ok &&
      data.sourceTemplateId &&
      !isInternalOperationalEmailTemplate(data.sourceTemplateId)
    ) {
      this.enqueueEmailDeliveryFailedAlert({
        templateId: data.sourceTemplateId,
        recipient: data.to,
        provider: this.email.getProviderName(),
        errorCode: 'SEND_FAILED',
        context: `subject=${data.subject}`,
      });
    }
  }

  /**
   * Anti-loop: `sourceTemplateId` is `ADMIN_EMAIL_DELIVERY_FAILED` (internal ADMIN_*).
   * No dependency on OperationalAlertsEmailService (avoids Nest DI cycle).
   */
  private enqueueEmailDeliveryFailedAlert(params: {
    templateId: string;
    recipient: string;
    provider: string;
    errorCode?: string;
    context?: string;
  }): void {
    const to = resolveMailOperationsTo();
    if (!to) {
      this.logger.warn(
        'ADMIN_EMAIL_DELIVERY_FAILED: no recipient (set MAIL_OPERATIONS_TO)',
      );
      return;
    }

    void this.enqueueTemplate({
      templateId: 'ADMIN_EMAIL_DELIVERY_FAILED',
      to,
      variables: buildAdminEmailDeliveryFailedVariables(params),
    }).catch((err) => {
      this.logger.error('enqueue ADMIN_EMAIL_DELIVERY_FAILED failed', err);
    });
  }

  async onModuleDestroy() {
    if (this.worker) await this.worker.close();
    if (this.queue) await this.queue.close();
  }
}
