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
import { ExcursionOperatorsModule } from '../excursion-operators/excursion-operators.module';
import { CategoryBannersModule } from '../category-banners/category-banners.module';
import { ProducerModule } from '../producer/producer.module';
import { AdminProducersService } from './admin-producers.service';
import { AdminGeneralPublicationsService } from './admin-general-publications.service';
import { EmailModule } from '../../email/email.module';
import { AdminGastroService } from './admin-gastro.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    AuthModule,
    ReferralsModule,
    InboxModule,
    SubcategoriesModule,
    RentalLocationsModule,
    ExcursionOperatorsModule,
    CategoryBannersModule,
    ProducerModule,
    EmailModule,
    NotificationsModule,
  ],
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
    AdminProducersService,
    AdminGeneralPublicationsService,
    AdminGastroService,
  ],
})
export class AdminModule {}
