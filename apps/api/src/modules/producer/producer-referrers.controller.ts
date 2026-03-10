import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@yo-te-invito/shared';
import { ReferralsService } from '../referrals/referrals.service';

@Controller('producer')
export class ProducerReferrersController {
  constructor(private readonly referrals: ReferralsService) {}

  @Get('referrers')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
  async listReferrers(@CurrentUser() user: { tenantId: string }) {
    return this.referrals.listReferrers(user.tenantId);
  }
}
