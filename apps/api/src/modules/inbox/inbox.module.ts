import { Module } from '@nestjs/common';
import { ReviewsModule } from '../reviews/reviews.module';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { InboxService } from './inbox.service';

@Module({
  imports: [ReviewsModule],
  providers: [InboxService, ProfilesAuthorizationService],
  exports: [InboxService],
})
export class InboxModule {}
