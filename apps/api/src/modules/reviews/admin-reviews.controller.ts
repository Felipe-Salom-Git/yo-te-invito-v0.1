import { Body, Controller, Get, Param, Post, Query, StreamableFile, UseGuards } from '@nestjs/common';
import {
  adminReviewsReportExportQuerySchema,
  adminReviewsReportQuerySchema,
  type AdminReviewsReportExportQuery,
  type AdminReviewsReportQuery,
} from '@yo-te-invito/shared';
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
import { AdminReviewsReportService } from './admin-reviews-report.service';

@Controller('admin/reviews')
@UseGuards(JwtOrDevAuthGuard, RolesGuard)
@RequireRole(Role.ADMIN)
export class AdminReviewsController {
  constructor(
    private readonly publicReviews: PublicReviewsService,
    private readonly report: AdminReviewsReportService,
  ) {}

  @Get('report')
  getReport(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(adminReviewsReportQuerySchema))
    query: AdminReviewsReportQuery,
  ) {
    return this.report.getReport(user.tenantId, query);
  }

  @Get('report/export')
  async exportReport(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(adminReviewsReportExportQuerySchema))
    query: AdminReviewsReportExportQuery,
  ): Promise<StreamableFile> {
    const csv = await this.report.exportCsv(user.tenantId, query);
    const dataset = query.dataset ?? 'problematic';
    return new StreamableFile(Buffer.from(csv, 'utf-8'), {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="reviews-${dataset}-report.csv"`,
    });
  }

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
