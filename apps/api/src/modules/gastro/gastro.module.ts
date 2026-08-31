import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { EmailModule } from '../../email/email.module';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { GastroRolesGuard } from '../../common/guards/gastro-roles.guard';
import { SubcategoriesModule } from '../subcategories/subcategories.module';
import { ReviewDisputesModule } from '../review-disputes/review-disputes.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { GastroController } from './gastro.controller';
import { GastroReviewsController } from './gastro-reviews.controller';
import { GastroService } from './gastro.service';
import { GastroLocalService } from './gastro-local.service';
import { GastroPortalDiscountsService } from './gastro-portal-discounts.service';
import { GastroContentService } from './gastro-content.service';
import { GastroDashboardService } from './gastro-dashboard.service';
import { GastroPublicEventSyncService } from './gastro-public-event-sync.service';
import { GastroCourtesyDiscountsService } from './gastro-courtesy-discounts.service';
import { GastroDiscountClaimEmailService } from './gastro-discount-claim-email.service';
import { GastroOwnershipService } from './gastro-ownership.service';
import { GastroDiscountMetricsService } from './gastro-discount-metrics.service';
import { GastroDiscountExpiryService } from './gastro-discount-expiry.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    AuthModule,
    EmailModule,
    SubcategoriesModule,
    ReviewDisputesModule,
    ReviewsModule,
    NotificationsModule,
  ],
  controllers: [GastroController, GastroReviewsController],
  providers: [
    ProfilesAuthorizationService,
    GastroRolesGuard,
    GastroService,
    GastroLocalService,
    GastroOwnershipService,
    GastroPortalDiscountsService,
    GastroContentService,
    GastroDashboardService,
    GastroPublicEventSyncService,
    GastroCourtesyDiscountsService,
    GastroDiscountClaimEmailService,
    GastroDiscountMetricsService,
    GastroDiscountExpiryService,
  ],
  exports: [
    GastroPortalDiscountsService,
    GastroOwnershipService,
    GastroContentService,
    GastroPublicEventSyncService,
    GastroDiscountClaimEmailService,
    GastroDiscountMetricsService,
    GastroDiscountExpiryService,
  ],
})
export class GastroModule {}
