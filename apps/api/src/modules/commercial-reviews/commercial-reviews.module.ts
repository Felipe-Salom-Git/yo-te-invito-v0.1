import { Module } from '@nestjs/common';
import { CommercialReviewsService } from './commercial-reviews.service';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';

@Module({
  providers: [CommercialReviewsService, ProfilesAuthorizationService],
  exports: [CommercialReviewsService],
})
export class CommercialReviewsModule {}
