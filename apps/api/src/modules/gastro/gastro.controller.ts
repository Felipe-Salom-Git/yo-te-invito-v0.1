import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { GastroRolesGuard } from '../../common/guards/gastro-roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@yo-te-invito/shared';
import { GastroService } from './gastro.service';

@Controller('gastro')
@UseGuards(JwtOrDevAuthGuard, GastroRolesGuard)
@RequireRole(Role.ADMIN, Role.GASTRO_OWNER)
export class GastroController {
  constructor(private readonly service: GastroService) {}

  @Get('events/:eventId/content')
  async listContent(@Param('eventId') eventId: string) {
    return this.service.listContent(eventId);
  }

  @Post('events/:eventId/content')
  async createContent(@Param('eventId') eventId: string, @Body() body: unknown) {
    return this.service.createContent(eventId, body);
  }

  @Patch('content/:id')
  async updateContent(@Param('id') id: string, @Body() body: unknown) {
    return this.service.updateContent(id, body);
  }

  @Get('events/:eventId/discounts')
  async listDiscounts(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('eventId') eventId: string,
  ) {
    return this.service.listDiscounts(user.tenantId, user.id, user.role, eventId);
  }

  @Post('events/:eventId/discounts')
  async createDiscount(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('eventId') eventId: string,
    @Body()
    body: {
      code: string;
      type: 'PERCENT' | 'FIXED';
      value: number;
      validFrom?: string;
      validTo?: string;
    },
  ) {
    return this.service.createDiscount(user.tenantId, user.id, user.role, eventId, body);
  }

  @Patch('discounts/:id')
  async updateDiscount(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('id') id: string,
    @Body()
    body: Partial<{
      status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
      validFrom: string | null;
      validTo: string | null;
      value: number;
    }>,
  ) {
    return this.service.updateDiscount(user.tenantId, user.id, user.role, id, body);
  }

  @Get('validations')
  async listValidations(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Query('discountId') discountId?: string,
  ) {
    return this.service.listValidations(user.tenantId, user.id, user.role, discountId);
  }

  @Post('validations')
  async recordValidation(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Body() body: { discountId: string; userId?: string; orderId?: string },
  ) {
    return this.service.recordValidation(
      user.tenantId,
      user.id,
      user.role,
      body.discountId,
      body.userId,
      body.orderId,
    );
  }
}
