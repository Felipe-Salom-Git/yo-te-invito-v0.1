import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { ProducerRolesGuard } from '../../common/guards/producer-roles.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ReviewDisputesService } from './review-disputes.service';
import { ProducerReviewsController } from './producer-reviews.controller';
import { AdminReviewDisputesController } from './admin-review-disputes.controller';

@Module({
  imports: [AuthModule, ReviewsModule, AuditModule, NotificationsModule],
  controllers: [ProducerReviewsController, AdminReviewDisputesController],
  providers: [ReviewDisputesService, ProfilesAuthorizationService, ProducerRolesGuard, RolesGuard],
  exports: [ReviewDisputesService],
})
export class ReviewDisputesModule {}
