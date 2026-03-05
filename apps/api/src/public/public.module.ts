import { Module } from '@nestjs/common';
import { PublicEventsController } from './public-events.controller';
import { PublicEventsService } from './public-events.service';
import { PublicTicketTypesController } from './public-ticket-types.controller';
import { PublicTicketTypesService } from './public-ticket-types.service';
import { PublicOrdersController } from './public-orders.controller';
import { PublicOrdersService } from './public-orders.service';
import { PublicReferralController } from './public-referral.controller';
import { PublicReviewsController } from './public-reviews.controller';
import { ReferralsModule } from '../modules/referrals/referrals.module';
import { ReviewsModule } from '../modules/reviews/reviews.module';

@Module({
  imports: [ReferralsModule, ReviewsModule],
  controllers: [
    PublicEventsController,
    PublicTicketTypesController,
    PublicOrdersController,
    PublicReferralController,
    PublicReviewsController,
  ],
  providers: [PublicEventsService, PublicTicketTypesService, PublicOrdersService],
})
export class PublicModule {}
