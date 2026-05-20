import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Role } from '@yo-te-invito/shared';
import {
  adminReviewDisputeActionSchema,
  adminReviewDisputeListQuerySchema,
  type AdminReviewDisputeActionInput,
  type AdminReviewDisputeListQuery,
} from '@yo-te-invito/shared';
import { ReviewDisputesService } from './review-disputes.service';

@Controller('admin/review-disputes')
@UseGuards(JwtOrDevAuthGuard, RolesGuard)
@RequireRole(Role.ADMIN)
export class AdminReviewDisputesController {
  constructor(private readonly reviewDisputes: ReviewDisputesService) {}

  @Get()
  list(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(adminReviewDisputeListQuerySchema))
    query: AdminReviewDisputeListQuery,
  ) {
    return this.reviewDisputes.listAdminDisputes(user.tenantId, query);
  }

  @Get(':id')
  get(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.reviewDisputes.getAdminDispute(user.tenantId, id);
  }

  @Post(':id/mark-in-review')
  markInReview(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminReviewDisputeActionSchema)) body: AdminReviewDisputeActionInput,
  ) {
    return this.reviewDisputes.markInReview(user.tenantId, user.id, user.role, id, body);
  }

  @Post(':id/accept')
  accept(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminReviewDisputeActionSchema)) body: AdminReviewDisputeActionInput,
  ) {
    return this.reviewDisputes.acceptDispute(user.tenantId, user.id, user.role, id, body);
  }

  @Post(':id/reject')
  reject(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminReviewDisputeActionSchema)) body: AdminReviewDisputeActionInput,
  ) {
    return this.reviewDisputes.rejectDispute(user.tenantId, user.id, user.role, id, body);
  }

  @Post(':id/resolve')
  resolve(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminReviewDisputeActionSchema)) body: AdminReviewDisputeActionInput,
  ) {
    return this.reviewDisputes.resolveDispute(user.tenantId, user.id, user.role, id, body);
  }
}
