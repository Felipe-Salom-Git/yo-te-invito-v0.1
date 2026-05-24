import { Module } from '@nestjs/common';
import { PublicEventsController } from './public-events.controller';
import { PublicEventsService } from './public-events.service';
import { PublicTicketTypesController } from './public-ticket-types.controller';
import { PublicTicketTypesService } from './public-ticket-types.service';
import { PublicOrdersController } from './public-orders.controller';
import { PublicOrdersService } from './public-orders.service';
import { PublicProducersController } from './public-producers.controller';
import { PublicProducersService } from './public-producers.service';
import { PublicReferralController } from './public-referral.controller';
import { PublicReviewsController } from './public-reviews.controller';
import { PublicReviewsV2Controller } from './public-reviews-v2.controller';
import { PublicGastroLocationsController } from './public-gastro-locations.controller';
import { PublicGastroLocationsService } from './public-gastro-locations.service';
import { PublicHotelLocationsController } from './public-hotel-locations.controller';
import { PublicHotelLocationsService } from './public-hotel-locations.service';
import { PublicPlatformConfigController } from './public-platform-config.controller';
import { PublicPlatformConfigService } from './public-platform-config.service';
import { PublicGastroDiscountsController } from './public-gastro-discounts.controller';
import { PublicGastroDiscountsService } from './public-gastro-discounts.service';
import { PublicEngagementService } from './public-engagement.service';
import { EmailModule } from '../email/email.module';
import { AuthModule } from '../auth/auth.module';
import { ProfilesAuthorizationService } from '../common/profiles-authorization.service';
import { PublicReferrersController } from './public-referrers.controller';
import { ReferralsModule } from '../modules/referrals/referrals.module';
import { ReviewsModule } from '../modules/reviews/reviews.module';
import { ReferrerModule } from '../modules/referrer/referrer.module';
import { TicketingModule } from '../ticketing/ticketing.module';
import { SubcategoriesModule } from '../modules/subcategories/subcategories.module';
import { RentalLocationsModule } from '../modules/rental-locations/rental-locations.module';
import { CategoryBannersModule } from '../modules/category-banners/category-banners.module';
import { GastroModule } from '../modules/gastro/gastro.module';

@Module({
  imports: [
    AuthModule,
    ReferralsModule,
    ReviewsModule,
    ReferrerModule,
    TicketingModule,
    SubcategoriesModule,
    RentalLocationsModule,
    CategoryBannersModule,
    GastroModule,
    EmailModule,
  ],
  controllers: [
    PublicEventsController,
    PublicTicketTypesController,
    PublicOrdersController,
    PublicProducersController,
    PublicReferralController,
    PublicReferrersController,
    PublicReviewsController,
    PublicReviewsV2Controller,
    PublicGastroLocationsController,
    PublicGastroDiscountsController,
    PublicHotelLocationsController,
    PublicPlatformConfigController,
  ],
  providers: [
    PublicEventsService,
    PublicTicketTypesService,
    PublicOrdersService,
    PublicProducersService,
    PublicGastroLocationsService,
    PublicGastroDiscountsService,
    PublicHotelLocationsService,
    PublicPlatformConfigService,
    PublicEngagementService,
    ProfilesAuthorizationService,
  ],
  exports: [PublicOrdersService],
})
export class PublicModule {}
