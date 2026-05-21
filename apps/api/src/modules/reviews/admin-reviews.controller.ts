import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@yo-te-invito/shared';
import {
  adminHideReviewSchema,
  adminRestoreReviewSchema,
  reviewReplyBodySchema,
  type AdminHideReviewInput,
  type AdminRestoreReviewInput,
  type ReviewReplyBody,
} from '@yo-te-invito/shared';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PublicReviewsService } from './public-reviews.service';

@Controller('admin/reviews')
@UseGuards(JwtOrDevAuthGuard, RolesGuard)
@RequireRole(Role.ADMIN)
export class AdminReviewsController {
  constructor(private readonly publicReviews: PublicReviewsService) {}

  @Post(':reviewId/hide')
  hide(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('reviewId') reviewId: string,
    @Body(new ZodValidationPipe(adminHideReviewSchema)) body: AdminHideReviewInput,
  ) {
    return this.publicReviews.hideReviewAdmin(
      user.tenantId,
      user.id,
      user.role,
      reviewId,
      body.reason,
      body.adminNote,
    );
  }

  @Post(':reviewId/restore')
  restore(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('reviewId') reviewId: string,
    @Body(new ZodValidationPipe(adminRestoreReviewSchema)) _body: AdminRestoreReviewInput,
  ) {
    return this.publicReviews.restoreReviewAdmin(
      user.tenantId,
      user.id,
      user.role,
      reviewId,
    );
  }

  @Post(':reviewId/reply')
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
      'PLATFORM_ADMIN',
    );
  }
}
