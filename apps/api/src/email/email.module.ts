import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailQueueService } from './email-queue.service';
import { OperationalAlertsEmailService } from './operational-alerts-email.service';

@Global()
@Module({
  providers: [EmailService, EmailQueueService, OperationalAlertsEmailService],
  exports: [EmailService, EmailQueueService, OperationalAlertsEmailService],
})
export class EmailModule {}
