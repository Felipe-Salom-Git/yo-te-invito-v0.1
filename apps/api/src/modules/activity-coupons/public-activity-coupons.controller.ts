import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  activityCouponClaimViewQuerySchema,
  activityCouponPublicClaimBodySchema,
  activityCouponPublicIdParamsSchema,
  type ActivityCouponPublicClaimBody,
} from '@yo-te-invito/shared';
import { z } from 'zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { OptionalJwtOrDevAuthGuard } from '../../auth/optional-jwt-or-dev-auth.guard';
import { ActivityCouponsService } from './activity-coupons.service';

const tenantQuery = z.object({ tenantId: z.string().min(1) }).strict();
const eventCouponsQuery = z
  .object({
    tenantId: z.string().min(1),
    eventId: z.string().min(1),
  })
  .strict();

@Controller('public/activity-coupons')
export class PublicActivityCouponsController {
  constructor(private readonly coupons: ActivityCouponsService) {}

  @Get('by-event')
  async listByEvent(
    @Query(new ZodValidationPipe(eventCouponsQuery))
    query: { tenantId: string; eventId: string },
  ) {
    return this.coupons.listPublicByEvent(query.tenantId, query.eventId);
  }

  @Get('claims/:claimId')
  async getClaim(
    @Param('claimId') claimId: string,
    @Query(new ZodValidationPipe(activityCouponClaimViewQuerySchema))
    query: { tenantId: string; accessToken?: string },
  ) {
    return this.coupons.getPublicClaim(query.tenantId, claimId, query.accessToken);
  }

  @Get(':id')
  async getOne(
    @Param(new ZodValidationPipe(activityCouponPublicIdParamsSchema))
    params: { id: string },
    @Query(new ZodValidationPipe(tenantQuery))
    query: { tenantId: string },
  ) {
    return this.coupons.getPublic(query.tenantId, params.id);
  }

  @Post(':id/claim')
  @UseGuards(OptionalJwtOrDevAuthGuard)
  async claim(
    @Param(new ZodValidationPipe(activityCouponPublicIdParamsSchema))
    params: { id: string },
    @Body(new ZodValidationPipe(activityCouponPublicClaimBodySchema))
    body: ActivityCouponPublicClaimBody,
    @Req() req: { user?: { id: string; role: string } },
  ) {
    const user = req.user;
    return this.coupons.claimPublic(
      body.tenantId,
      params.id,
      body.email,
      user?.id ?? null,
      user?.role ?? 'GUEST',
      user?.id,
    );
  }
}
