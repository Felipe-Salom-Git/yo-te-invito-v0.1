import { Controller, Post } from '@nestjs/common';
import { OrderExpirationService } from './order-expiration.service';

/**
 * Internal endpoint to trigger order expiration job.
 * In dev: call manually. In prod: can be triggered by external cron/scheduler.
 */
@Controller('internal/jobs')
export class OrderExpirationController {
  constructor(private readonly service: OrderExpirationService) {}

  @Post('expire-orders')
  async runExpireOrders() {
    return this.service.expireOrdersJob();
  }
}
