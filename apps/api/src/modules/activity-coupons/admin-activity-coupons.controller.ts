import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  Role,
  activityCouponCreateSchema,
  activityCouponIdParamsSchema,
  activityCouponOperatorIdParamsSchema,
  activityCouponRejectSchema,
  activityCouponStatusPatchSchema,
  activityCouponUpdateSchema,
  type ActivityCouponCreateInput,
  type ActivityCouponRejectInput,
  type ActivityCouponStatusPatch,
  type ActivityCouponUpdateInput,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActivityCouponsService } from './activity-coupons.service';

@Controller('admin/excursion-operators/:operatorId/activity-coupons')
@UseGuards(JwtOrDevAuthGuard, RolesGuard)
@RequireRole(Role.ADMIN)
export class AdminActivityCouponsController {
  constructor(private readonly coupons: ActivityCouponsService) {}

  @Get()
  async list(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(activityCouponOperatorIdParamsSchema))
    params: { operatorId: string },
  ) {
    return this.coupons.listByOperator(user.tenantId, params.operatorId);
  }

  @Post()
  async create(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(activityCouponOperatorIdParamsSchema))
    params: { operatorId: string },
    @Body(new ZodValidationPipe(activityCouponCreateSchema))
    body: ActivityCouponCreateInput,
  ) {
    return this.coupons.createForAdmin(
      user.tenantId,
      user.id,
      user.role,
      params.operatorId,
      body,
    );
  }

  @Get(':couponId')
  async getOne(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(activityCouponIdParamsSchema))
    params: { operatorId: string; couponId: string },
  ) {
    return this.coupons.getForOperator(user.tenantId, params.operatorId, params.couponId);
  }

  @Patch(':couponId')
  async update(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(activityCouponIdParamsSchema))
    params: { operatorId: string; couponId: string },
    @Body(new ZodValidationPipe(activityCouponUpdateSchema))
    body: ActivityCouponUpdateInput,
  ) {
    return this.coupons.updateForAdmin(
      user.tenantId,
      user.id,
      user.role,
      params.operatorId,
      params.couponId,
      body,
    );
  }

  @Post(':couponId/archive')
  async archive(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(activityCouponIdParamsSchema))
    params: { operatorId: string; couponId: string },
  ) {
    return this.coupons.archiveForAdmin(
      user.tenantId,
      user.id,
      user.role,
      params.operatorId,
      params.couponId,
    );
  }

  @Post(':couponId/unarchive')
  async unarchive(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(activityCouponIdParamsSchema))
    params: { operatorId: string; couponId: string },
  ) {
    return this.coupons.unarchiveForAdmin(
      user.tenantId,
      user.id,
      user.role,
      params.operatorId,
      params.couponId,
    );
  }

  @Patch(':couponId/status')
  async patchStatus(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(activityCouponIdParamsSchema))
    params: { operatorId: string; couponId: string },
    @Body(new ZodValidationPipe(activityCouponStatusPatchSchema))
    body: ActivityCouponStatusPatch,
  ) {
    return this.coupons.patchStatusForAdmin(
      user.tenantId,
      user.id,
      user.role,
      params.operatorId,
      params.couponId,
      body.status,
    );
  }

  @Post(':couponId/approve')
  async approve(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(activityCouponIdParamsSchema))
    params: { operatorId: string; couponId: string },
  ) {
    return this.coupons.approvePending(
      user.tenantId,
      user.id,
      user.role,
      params.operatorId,
      params.couponId,
    );
  }

  @Post(':couponId/reject')
  async reject(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(activityCouponIdParamsSchema))
    params: { operatorId: string; couponId: string },
    @Body(new ZodValidationPipe(activityCouponRejectSchema))
    body: ActivityCouponRejectInput,
  ) {
    return this.coupons.rejectPending(
      user.tenantId,
      user.id,
      user.role,
      params.operatorId,
      params.couponId,
      body.reason,
    );
  }
}
