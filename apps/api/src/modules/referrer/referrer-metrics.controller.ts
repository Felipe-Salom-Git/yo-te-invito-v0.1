import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { ReferrerRolesGuard } from '../../common/guards/referrer-roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@yo-te-invito/shared';
import { ReferralMetricsService } from '../referrals/referral-metrics.service';
import { ReferrerProfilesService } from './referrer-profiles.service';

@Controller('referrer')
@UseGuards(JwtOrDevAuthGuard, ReferrerRolesGuard)
@RequireRole(Role.ADMIN, Role.REFERRER)
export class ReferrerMetricsController {
  constructor(
    private readonly metrics: ReferralMetricsService,
    private readonly referrers: ReferrerProfilesService,
  ) {}

  private async referrerProfileId(tenantId: string, userId: string): Promise<string> {
    const profile = await this.referrers.getMyProfile(tenantId, userId);
    return profile.id;
  }

  @Get('metrics')
  async getMetrics(@CurrentUser() user: { id: string; tenantId: string }) {
    const referrerProfileId = await this.referrerProfileId(user.tenantId, user.id);
    return this.metrics.getReferrerMetrics(user.tenantId, referrerProfileId);
  }

  @Get('agreements/:id/metrics')
  async getAgreementMetrics(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') agreementId: string,
  ) {
    const referrerProfileId = await this.referrerProfileId(user.tenantId, user.id);
    return this.metrics.getReferrerAgreementMetrics(
      user.tenantId,
      referrerProfileId,
      agreementId,
    );
  }
}
