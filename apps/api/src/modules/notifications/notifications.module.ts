import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsAdminController } from './notifications-admin.controller';
import { NotificationsSchedulerService } from './notifications-scheduler.service';
import { UserNotificationsService } from './user-notifications.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [NotificationsAdminController],
  providers: [UserNotificationsService, NotificationsSchedulerService],
  exports: [UserNotificationsService, NotificationsSchedulerService],
})
export class NotificationsModule {}
