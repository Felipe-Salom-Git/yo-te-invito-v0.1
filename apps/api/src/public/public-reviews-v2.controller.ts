import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  publicReviewsListQuerySchema,
  reviewEntitySummaryQuerySchema,
  userPublicReviewsQuerySchema,
  type PublicReviewsListQuery,
  type ReviewEntitySummaryQuery,
  type UserPublicReviewsQuery,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PublicReviewsService } from '../modules/reviews/public-reviews.service';

@Controller('public')
export class PublicReviewsV2Controller {
  constructor(private readonly publicReviews: PublicReviewsService) {}

  @Get('reviews/summary')
  getSummary(
    @Query(new ZodValidationPipe(reviewEntitySummaryQuerySchema))
    query: ReviewEntitySummaryQuery,
  ) {
    return this.publicReviews.getEntitySummary(query);
  }

  @Get('reviews')
  list(
    @Query(new ZodValidationPipe(publicReviewsListQuerySchema))
    query: PublicReviewsListQuery,
  ) {
    return this.publicReviews.listPublic(query);
  }

  @Get('users/:userId/review-profile')
  getUserProfile(
    @Param('userId') userId: string,
    @Query('tenantId') tenantId: string,
  ) {
    if (!tenantId?.trim()) {
      return this.publicReviews.getUserPublicProfile('tenant-demo', userId);
    }
    return this.publicReviews.getUserPublicProfile(tenantId.trim(), userId);
  }

  @Get('users/:userId/reviews')
  listUserReviews(
    @Param('userId') userId: string,
    @Query(new ZodValidationPipe(userPublicReviewsQuerySchema))
    query: UserPublicReviewsQuery,
  ) {
    return this.publicReviews.listUserPublicReviews(
      query.tenantId,
      userId,
      query,
    );
  }
}
