import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { ProducerRolesGuard } from '../../common/guards/producer-roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@yo-te-invito/shared';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { ReferralMetricsService } from '../referrals/referral-metrics.service';

@Controller('producer/referrals')
@UseGuards(JwtOrDevAuthGuard, ProducerRolesGuard)
@RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
export class ProducerReferralMetricsController {
  constructor(
    private readonly metrics: ReferralMetricsService,
    private readonly profilesAuth: ProfilesAuthorizationService,
  ) {}

  private async producerProfileId(tenantId: string, userId: string): Promise<string> {
    const profileId = await this.profilesAuth.getDefaultProducerProfileId(tenantId, userId);
    if (!profileId) throw new NotFoundException('No active producer profile found');
    return profileId;
  }

  @Get('metrics')
  async getGlobal(@CurrentUser() user: { id: string; tenantId: string }) {
    const producerProfileId = await this.producerProfileId(user.tenantId, user.id);
    return this.metrics.getProducerMetrics(user.tenantId, producerProfileId);
  }
}

@Controller('producer/events')
@UseGuards(JwtOrDevAuthGuard, ProducerRolesGuard)
@RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
export class ProducerEventReferralMetricsController {
  constructor(
    private readonly metrics: ReferralMetricsService,
    private readonly profilesAuth: ProfilesAuthorizationService,
  ) {}

  private async producerProfileId(tenantId: string, userId: string): Promise<string> {
    const profileId = await this.profilesAuth.getDefaultProducerProfileId(tenantId, userId);
    if (!profileId) throw new NotFoundException('No active producer profile found');
    return profileId;
  }

  @Get(':eventId/referrals/metrics')
  async getEventMetrics(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('eventId') eventId: string,
  ) {
    const producerProfileId = await this.producerProfileId(user.tenantId, user.id);
    return this.metrics.getProducerEventMetrics(user.tenantId, producerProfileId, eventId);
  }
}
