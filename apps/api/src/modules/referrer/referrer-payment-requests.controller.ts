import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  Role,
  createReferralPaymentRequestSchema,
  type CreateReferralPaymentRequestInput,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { ReferrerRolesGuard } from '../../common/guards/referrer-roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReferralPaymentRequestsService } from '../referrals/referral-payment-requests.service';
import { ReferrerProfilesService } from './referrer-profiles.service';

@Controller('referrer/payment-requests')
@UseGuards(JwtOrDevAuthGuard, ReferrerRolesGuard)
@RequireRole(Role.ADMIN, Role.REFERRER)
export class ReferrerPaymentRequestsController {
  constructor(
    private readonly paymentRequests: ReferralPaymentRequestsService,
    private readonly referrers: ReferrerProfilesService,
  ) {}

  private async referrerProfileId(tenantId: string, userId: string): Promise<string> {
    const profile = await this.referrers.getMyProfile(tenantId, userId);
    return profile.id;
  }

  @Get('eligible-commissions')
  async listEligible(@CurrentUser() user: { id: string; tenantId: string }) {
    const referrerProfileId = await this.referrerProfileId(user.tenantId, user.id);
    return this.paymentRequests.listEligibleCommissionsForReferrer(
      user.tenantId,
      referrerProfileId,
    );
  }

  @Get()
  async list(@CurrentUser() user: { id: string; tenantId: string }) {
    const referrerProfileId = await this.referrerProfileId(user.tenantId, user.id);
    return this.paymentRequests.listForReferrer(user.tenantId, referrerProfileId);
  }

  @Get(':id')
  async getById(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') id: string,
  ) {
    const referrerProfileId = await this.referrerProfileId(user.tenantId, user.id);
    return this.paymentRequests.getForReferrer(user.tenantId, referrerProfileId, id);
  }

  @Post()
  async create(
    @CurrentUser() user: { id: string; tenantId: string; role?: string },
    @Body(new ZodValidationPipe(createReferralPaymentRequestSchema))
    body: CreateReferralPaymentRequestInput,
  ) {
    const referrerProfileId = await this.referrerProfileId(user.tenantId, user.id);
    return this.paymentRequests.createForReferrer(
      user.tenantId,
      referrerProfileId,
      user.id,
      user.role ?? Role.REFERRER,
      body,
    );
  }

  @Post(':id/cancel')
  async cancel(
    @CurrentUser() user: { id: string; tenantId: string; role?: string },
    @Param('id') id: string,
  ) {
    const referrerProfileId = await this.referrerProfileId(user.tenantId, user.id);
    return this.paymentRequests.cancelForReferrer(
      user.tenantId,
      referrerProfileId,
      id,
      user.id,
      user.role ?? Role.REFERRER,
    );
  }
}
