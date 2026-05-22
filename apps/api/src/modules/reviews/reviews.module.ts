import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReviewsController } from './reviews.controller';
import { MeReviewsController } from './me-reviews.controller';
import { AdminReviewsController } from './admin-reviews.controller';
import { ReviewsService } from './reviews.service';
import { PublicReviewsService } from './public-reviews.service';
import { ReviewRankingService } from './review-ranking.service';
import { ReviewReputationService } from './review-reputation.service';
import { AdminReviewsReportService } from './admin-reviews-report.service';

@Module({
  imports: [AuthModule, AuditModule, NotificationsModule],
  controllers: [ReviewsController, MeReviewsController, AdminReviewsController],
  providers: [
    ReviewsService,
    PublicReviewsService,
    ReviewRankingService,
    ReviewReputationService,
    AdminReviewsReportService,
    ProfilesAuthorizationService,
  ],
  exports: [ReviewsService, PublicReviewsService, ReviewRankingService],
})
export class ReviewsModule {}
