import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsAdminController } from './notifications-admin.controller';
import { NotificationsSchedulerService } from './notifications-scheduler.service';
import { EventPublicationAlertsService } from './event-publication-alerts.service';
import { SmartAlertsPreparedService } from './smart-alerts-prepared.service';
import { UserNotificationsService } from './user-notifications.service';
import { ProducerEventStatusNotificationsService } from './producer-event-status-notifications.service';
import { WebPushService } from './web-push.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [NotificationsAdminController],
  providers: [
    WebPushService,
    UserNotificationsService,
    NotificationsSchedulerService,
    SmartAlertsPreparedService,
    EventPublicationAlertsService,
    ProducerEventStatusNotificationsService,
  ],
  exports: [
    WebPushService,
    UserNotificationsService,
    NotificationsSchedulerService,
    SmartAlertsPreparedService,
    EventPublicationAlertsService,
    ProducerEventStatusNotificationsService,
  ],
})
export class NotificationsModule {}
