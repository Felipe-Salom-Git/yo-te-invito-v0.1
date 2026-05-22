import { Module } from '@nestjs/common';
import { SubcategoriesModule } from '../subcategories/subcategories.module';
import { RentalLocationsModule } from '../rental-locations/rental-locations.module';
import { AuthModule } from '../../auth/auth.module';
import { TicketingModule } from '../../ticketing/ticketing.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { CommercialReviewsModule } from '../commercial-reviews/commercial-reviews.module';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { ProducerEventsController } from './producer-events.controller';
import { ProducerReferrersController } from './producer-referrers.controller';
import { ProducerReferralProposalsController } from './producer-referral-proposals.controller';
import { ProducerReferralPaymentRequestsController } from './producer-referral-payment-requests.controller';
import {
  ProducerEventReferralMetricsController,
  ProducerReferralMetricsController,
} from './producer-referral-metrics.controller';
import { ProducerRolesGuard } from '../../common/guards/producer-roles.guard';
import { ProducerTicketTypesController } from './producer-ticket-types.controller';
import { ProducerTicketTemplateController } from './producer-ticket-template.controller';
import { ProducerTicketTemplateService } from './producer-ticket-template.service';
import { EventMetricsService } from './event-metrics.service';
import { ProducerEventsCrudService } from './producer-events-crud.service';
import { ProducerTicketTypesService } from './producer-ticket-types.service';
import { ProducerProfileController } from './producer-profile.controller';
import { ProducerProfileService } from './producer-profile.service';
import { ProducerDashboardController } from './producer-dashboard.controller';
import { ProducerDashboardMetricsService } from './producer-dashboard-metrics.service';

@Module({
  imports: [
    AuthModule,
    ReferralsModule,
    TicketingModule,
    ReviewsModule,
    CommercialReviewsModule,
    SubcategoriesModule,
    RentalLocationsModule,
  ],
  controllers: [
    ProducerEventsController,
    ProducerReferrersController,
    ProducerReferralProposalsController,
    ProducerReferralPaymentRequestsController,
    ProducerReferralMetricsController,
    ProducerEventReferralMetricsController,
    ProducerTicketTypesController,
    ProducerTicketTemplateController,
    ProducerProfileController,
    ProducerDashboardController,
  ],
  providers: [
    ProfilesAuthorizationService,
    ProducerRolesGuard,
    EventMetricsService,
    ProducerEventsCrudService,
    ProducerTicketTypesService,
    ProducerTicketTemplateService,
    ProducerProfileService,
    ProducerDashboardMetricsService,
  ],
  exports: [EventMetricsService],
})
export class ProducerModule { }
