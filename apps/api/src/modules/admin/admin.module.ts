import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { AdminController } from './admin.controller';
import { AdminEventsService } from './admin-events.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminTicketsService } from './admin-tickets.service';
import { AdminFraudService } from './admin-fraud.service';
import { PlatformMetricsService } from './platform-metrics.service';
import { AdminUsersService } from './admin-users.service';
import { AdminConfigService } from './admin-config.service';
import { AdminApplicationsService } from './admin-applications.service';

@Module({
  imports: [AuthModule, ReferralsModule],
  controllers: [AdminController],
  providers: [
    AdminEventsService,
    AdminAuditService,
    AdminTicketsService,
    AdminFraudService,
    PlatformMetricsService,
    AdminUsersService,
    AdminConfigService,
    AdminApplicationsService,
  ],
})
export class AdminModule {}
