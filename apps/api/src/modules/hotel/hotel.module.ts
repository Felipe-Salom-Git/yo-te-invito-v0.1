import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { HotelRolesGuard } from '../../common/guards/hotel-roles.guard';
import { ReviewDisputesModule } from '../review-disputes/review-disputes.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { HotelController } from './hotel.controller';
import { HotelReviewsController } from './hotel-reviews.controller';
import { HotelService } from './hotel.service';

@Module({
  imports: [AuthModule, ReviewDisputesModule, ReviewsModule],
  controllers: [HotelController, HotelReviewsController],
  providers: [HotelService, ProfilesAuthorizationService, HotelRolesGuard],
})
export class HotelModule {}
