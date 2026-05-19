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
import { PublicReferrersController } from './public-referrers.controller';
import { ReferralsModule } from '../modules/referrals/referrals.module';
import { ReviewsModule } from '../modules/reviews/reviews.module';
import { ReferrerModule } from '../modules/referrer/referrer.module';
import { TicketingModule } from '../ticketing/ticketing.module';
import { SubcategoriesModule } from '../modules/subcategories/subcategories.module';
import { RentalLocationsModule } from '../modules/rental-locations/rental-locations.module';

@Module({
  imports: [
    ReferralsModule,
    ReviewsModule,
    ReferrerModule,
    TicketingModule,
    SubcategoriesModule,
    RentalLocationsModule,
  ],
  controllers: [
    PublicEventsController,
    PublicTicketTypesController,
    PublicOrdersController,
    PublicProducersController,
    PublicReferralController,
    PublicReferrersController,
    PublicReviewsController,
  ],
  providers: [
    PublicEventsService,
    PublicTicketTypesService,
    PublicOrdersService,
    PublicProducersService,
  ],
})
export class PublicModule {}
