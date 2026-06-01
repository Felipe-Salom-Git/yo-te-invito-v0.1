/**
 * Email queue using BullMQ + Redis.
 * If REDIS_URL is not set, falls back to sending synchronously via EmailService.
 */
import { Inject, Injectable, OnModuleDestroy, forwardRef } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { resolveMailFrom, resolveMailReplyTo } from './mail-config';
import { EmailService } from './email.service';
import type { SendEmailOptions } from './send-email-options';
import { renderEmailTemplate } from './templates/email-template.renderer';
import type { EmailTemplateId } from './templates/email-template.types';
import { isInternalOperationalEmailTemplate } from './templates/admin-operational-email.util';
import { OperationalAlertsEmailService } from './operational-alerts-email.service';

const QUEUE_NAME = 'emails';
const REDIS_URL = process.env.REDIS_URL ?? '';

export interface EmailJobData extends SendEmailOptions {
  /** When set, a failed send may notify operations (except internal ADMIN_* templates). */
  sourceTemplateId?: EmailTemplateId;
}

@Injectable()
export class EmailQueueService implements OnModuleDestroy {
  private queue: Queue<EmailJobData> | null = null;
  private worker: Worker<EmailJobData> | null = null;

  constructor(
    private readonly email: EmailService,
    @Inject(forwardRef(() => OperationalAlertsEmailService))
    private readonly operationalAlerts: OperationalAlertsEmailService,
  ) {
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
      this.operationalAlerts.notifyEmailDeliveryFailed({
        templateId: data.sourceTemplateId,
        recipient: data.to,
        provider: this.email.getProviderName(),
        errorCode: 'SEND_FAILED',
        context: `subject=${data.subject}`,
      });
    }
  }

  async onModuleDestroy() {
    if (this.worker) await this.worker.close();
    if (this.queue) await this.queue.close();
  }
}
