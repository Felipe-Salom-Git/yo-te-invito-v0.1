import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  gastroContentCreateSchema,
  gastroContentUpdateSchema,
  gastroDiscountCreateSchema,
  gastroDiscountUpdateSchema,
  gastroLocalCreateSchema,
  gastroLocalUpdateSchema,
  Role,
  type GastroContentCreateInput,
  type GastroContentUpdateInput,
  type GastroDiscountCreateInput,
  type GastroDiscountUpdateInput,
  gastroValidationListQuerySchema,
  type GastroLocalCreateInput,
  type GastroLocalUpdateInput,
  type GastroValidationListQuery,
} from '@yo-te-invito/shared';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { GastroRolesGuard } from '../../common/guards/gastro-roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { GastroService } from './gastro.service';
import { GastroLocalService } from './gastro-local.service';
import { GastroPortalDiscountsService } from './gastro-portal-discounts.service';
import { GastroContentService } from './gastro-content.service';
import { GastroDashboardService } from './gastro-dashboard.service';

@Controller('gastro')
@UseGuards(JwtOrDevAuthGuard, GastroRolesGuard)
@RequireRole(Role.ADMIN, Role.GASTRO_OWNER)
export class GastroController {
  constructor(
    private readonly service: GastroService,
    private readonly localService: GastroLocalService,
    private readonly portalDiscounts: GastroPortalDiscountsService,
    private readonly contentService: GastroContentService,
    private readonly dashboard: GastroDashboardService,
  ) {}

  @Get('dashboard')
  async getDashboard(@CurrentUser() user: { id: string; tenantId: string; role: string }) {
    return this.dashboard.getDashboard(user.tenantId, user.id, user.role);
  }

  @Get('local')
  async getMyLocal(@CurrentUser() user: { id: string; tenantId: string; role: string }) {
    return this.localService.getMyLocal(user.tenantId, user.id, user.role);
  }

  @Post('local')
  async createMyLocal(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Body(new ZodValidationPipe(gastroLocalCreateSchema)) body: GastroLocalCreateInput,
  ) {
    return this.localService.createMyLocal(user.tenantId, user.id, user.role, body);
  }

  @Patch('local')
  async updateMyLocal(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Body(new ZodValidationPipe(gastroLocalUpdateSchema)) body: GastroLocalUpdateInput,
  ) {
    return this.localService.updateMyLocal(user.tenantId, user.id, user.role, body);
  }

  @Get('discounts')
  async listMyDiscounts(@CurrentUser() user: { id: string; tenantId: string; role: string }) {
    return this.portalDiscounts.listMyDiscounts(user.tenantId, user.id, user.role);
  }

  @Get('discounts/:id')
  async getMyDiscount(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('id') id: string,
  ) {
    return this.portalDiscounts.getMyDiscount(user.tenantId, user.id, user.role, id);
  }

  @Post('discounts')
  async createMyDiscount(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Body(new ZodValidationPipe(gastroDiscountCreateSchema)) body: GastroDiscountCreateInput,
  ) {
    return this.portalDiscounts.createMyDiscount(user.tenantId, user.id, user.role, body);
  }

  @Patch('discounts/:id')
  async updateMyDiscount(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(gastroDiscountUpdateSchema)) body: GastroDiscountUpdateInput,
  ) {
    return this.portalDiscounts.updateMyDiscount(user.tenantId, user.id, user.role, id, body);
  }

  @Get('events/:eventId/content')
  async listContent(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('eventId') eventId: string,
  ) {
    return this.contentService.listByEvent(user.tenantId, user.id, user.role, eventId);
  }

  @Post('events/:eventId/content')
  async createContent(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(gastroContentCreateSchema)) body: GastroContentCreateInput,
  ) {
    return this.contentService.createForEvent(user.tenantId, user.id, user.role, eventId, body);
  }

  @Patch('content/:id')
  async updateContent(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(gastroContentUpdateSchema)) body: GastroContentUpdateInput,
  ) {
    return this.contentService.updateById(user.tenantId, user.id, user.role, id, body);
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
      status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING_REVIEW';
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
    @Query(new ZodValidationPipe(gastroValidationListQuerySchema))
    query: GastroValidationListQuery,
  ) {
    return this.dashboard.listValidations(user.tenantId, user.id, user.role, query);
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
