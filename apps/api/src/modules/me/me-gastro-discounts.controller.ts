import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MeGastroDiscountsService } from './me-gastro-discounts.service';

@Controller('me/gastro-discounts')
@UseGuards(JwtOrDevAuthGuard)
export class MeGastroDiscountsController {
  constructor(private readonly service: MeGastroDiscountsService) {}

  @Get()
  async list(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.service.listForUser(user.tenantId, user.id);
  }
}
