import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@yo-te-invito/shared';
import {
  producerManagedReviewListQuerySchema,
  reviewReplyBodySchema,
  type ProducerManagedReviewListQuery,
  type ReviewReplyBody,
} from '@yo-te-invito/shared';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { GastroRolesGuard } from '../../common/guards/gastro-roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ReviewDisputesService } from '../review-disputes/review-disputes.service';
import { PublicReviewsService } from '../reviews/public-reviews.service';

@Controller('gastro')
@UseGuards(JwtOrDevAuthGuard, GastroRolesGuard)
@RequireRole(Role.ADMIN, Role.GASTRO_OWNER)
export class GastroReviewsController {
  constructor(
    private readonly reviewDisputes: ReviewDisputesService,
    private readonly publicReviews: PublicReviewsService,
  ) {}

  @Get('reviews/summary')
  getSummary(@CurrentUser() user: { id: string; tenantId: string; role: string }) {
    return this.reviewDisputes.getGastroSummary(user.tenantId, user.id, user.role);
  }

  @Get('reviews')
  listReviews(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Query(new ZodValidationPipe(producerManagedReviewListQuerySchema))
    query: ProducerManagedReviewListQuery,
  ) {
    return this.reviewDisputes.listGastroReviews(user.tenantId, user.id, user.role, query);
  }

  @Post('reviews/:reviewId/reply')
  reply(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('reviewId') reviewId: string,
    @Body(new ZodValidationPipe(reviewReplyBodySchema)) body: ReviewReplyBody,
  ) {
    return this.publicReviews.replyAsManager(
      user.tenantId,
      user.id,
      user.role,
      reviewId,
      body,
      'GASTRO_OWNER',
    );
  }
}
