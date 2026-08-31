import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActivityCouponsService } from '../activity-coupons/activity-coupons.service';

@Controller('me/activity-coupons')
@UseGuards(JwtOrDevAuthGuard)
export class MeActivityCouponsController {
  constructor(private readonly coupons: ActivityCouponsService) {}

  @Get()
  async list(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.coupons.listMine(user.tenantId, user.id);
  }
}
