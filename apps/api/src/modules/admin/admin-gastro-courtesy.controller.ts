import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  Role,
  adminGastroCourtesyFundSendBodySchema,
  type AdminGastroCourtesyFundSendBody,
} from '@yo-te-invito/shared';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { GastroCourtesyDiscountsService } from '../gastro/gastro-courtesy-discounts.service';

@Controller('admin/gastro/courtesies')
@UseGuards(JwtOrDevAuthGuard, RolesGuard)
@RequireRole(Role.ADMIN)
export class AdminGastroCourtesyController {
  constructor(private readonly courtesyDiscounts: GastroCourtesyDiscountsService) {}

  @Post('send')
  sendFundedCourtesy(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Body(new ZodValidationPipe(adminGastroCourtesyFundSendBodySchema))
    body: AdminGastroCourtesyFundSendBody,
  ) {
    return this.courtesyDiscounts.sendCourtesy(user.tenantId, user.id, user.role, body);
  }
}
