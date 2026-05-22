import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { ReferrerRolesGuard } from '../../common/guards/referrer-roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@yo-te-invito/shared';
import { ReferralProposalsService } from '../referrals/referral-proposals.service';
import { ReferrerProfilesService } from './referrer-profiles.service';

@Controller('referrer/proposals')
@UseGuards(JwtOrDevAuthGuard, ReferrerRolesGuard)
@RequireRole(Role.ADMIN, Role.REFERRER)
export class ReferrerProposalsController {
  constructor(
    private readonly proposals: ReferralProposalsService,
    private readonly referrers: ReferrerProfilesService,
  ) {}

  private async referrerProfileId(tenantId: string, userId: string): Promise<string> {
    const profile = await this.referrers.getMyProfile(tenantId, userId);
    return profile.id;
  }

  @Get()
  async list(@CurrentUser() user: { id: string; tenantId: string }) {
    const referrerProfileId = await this.referrerProfileId(user.tenantId, user.id);
    return this.proposals.listForReferrer(user.tenantId, referrerProfileId);
  }

  @Get(':id')
  async getById(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') id: string,
  ) {
    const referrerProfileId = await this.referrerProfileId(user.tenantId, user.id);
    return this.proposals.getForReferrer(user.tenantId, referrerProfileId, id);
  }

  @Post(':id/accept')
  async accept(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') id: string,
  ) {
    const referrerProfileId = await this.referrerProfileId(user.tenantId, user.id);
    return this.proposals.acceptForReferrer(user.tenantId, referrerProfileId, id);
  }

  @Post(':id/reject')
  async reject(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') id: string,
  ) {
    const referrerProfileId = await this.referrerProfileId(user.tenantId, user.id);
    return this.proposals.rejectForReferrer(user.tenantId, referrerProfileId, id);
  }
}
