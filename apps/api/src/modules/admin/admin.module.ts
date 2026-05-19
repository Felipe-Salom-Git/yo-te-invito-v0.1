import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { InboxModule } from '../inbox/inbox.module';
import { AdminController } from './admin.controller';
import { AdminEventsService } from './admin-events.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminTicketsService } from './admin-tickets.service';
import { AdminFraudService } from './admin-fraud.service';
import { PlatformMetricsService } from './platform-metrics.service';
import { AdminUsersService } from './admin-users.service';
import { AdminConfigService } from './admin-config.service';
import { AdminApplicationsService } from './admin-applications.service';
import { AdminProfilesService } from './admin-profiles.service';
import { SubcategoriesModule } from '../subcategories/subcategories.module';
import { RentalLocationsModule } from '../rental-locations/rental-locations.module';

@Module({
  imports: [AuthModule, ReferralsModule, InboxModule, SubcategoriesModule, RentalLocationsModule],
  controllers: [AdminController],
  providers: [
    AdminEventsService,
    AdminProfilesService,
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
