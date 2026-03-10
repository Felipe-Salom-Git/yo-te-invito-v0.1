/**
 * Email queue using BullMQ + Redis.
 * If REDIS_URL is not set, falls back to sending synchronously via EmailService.
 */
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { EmailService } from './email.service';
import type { SendEmailOptions } from './email.service';

const QUEUE_NAME = 'emails';
const REDIS_URL = process.env.REDIS_URL ?? '';

export interface EmailJobData extends SendEmailOptions {}

@Injectable()
export class EmailQueueService implements OnModuleDestroy {
  private queue: Queue<EmailJobData> | null = null;
  private worker: Worker<EmailJobData> | null = null;

  constructor(private readonly email: EmailService) {
    if (REDIS_URL) {
      const connection = { url: REDIS_URL };
      this.queue = new Queue<EmailJobData>(QUEUE_NAME, { connection });
      this.worker = new Worker<EmailJobData>(
        QUEUE_NAME,
        async (job) => {
          await this.email.send(job.data);
        },
        { connection }
      );
    }
  }

  async enqueue(options: SendEmailOptions): Promise<void> {
    if (this.queue) {
      await this.queue.add('send', options);
    } else {
      this.email.send(options).catch(() => {});
    }
  }

  async onModuleDestroy() {
    if (this.worker) await this.worker.close();
    if (this.queue) await this.queue.close();
  }
}
