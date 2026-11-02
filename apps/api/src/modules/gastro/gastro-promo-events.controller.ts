import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  Role,
  gastroPromoEventCreateSchema,
  gastroPromoEventListQuerySchema,
  gastroPromoEventUpdateSchema,
  type GastroPromoEventCreateInput,
  type GastroPromoEventListQuery,
  type GastroPromoEventUpdateInput,
} from '@yo-te-invito/shared';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { GastroRolesGuard } from '../../common/guards/gastro-roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { GastroPromoEventsService } from './gastro-promo-events.service';

type AuthUser = { id: string; tenantId: string; role: string };

/** G12.2 — Promotional events of a gastro local (portal `/gastro/contenido`). */
@Controller('gastro')
@UseGuards(JwtOrDevAuthGuard, GastroRolesGuard)
@RequireRole(Role.ADMIN, Role.GASTRO_OWNER)
export class GastroPromoEventsController {
  constructor(private readonly promoEvents: GastroPromoEventsService) {}

  @Get('promo-events')
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(gastroPromoEventListQuerySchema)) query: GastroPromoEventListQuery,
  ) {
    return this.promoEvents.list(user.tenantId, user.id, user.role, query.profileId);
  }

  @Post('promo-events')
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(gastroPromoEventCreateSchema)) body: GastroPromoEventCreateInput,
  ) {
    return this.promoEvents.create(user.tenantId, user.id, user.role, body);
  }

  @Get('promo-events/:eventId')
  get(@CurrentUser() user: AuthUser, @Param('eventId') eventId: string) {
    return this.promoEvents.get(user.tenantId, user.id, user.role, eventId);
  }

  @Patch('promo-events/:eventId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(gastroPromoEventUpdateSchema)) body: GastroPromoEventUpdateInput,
  ) {
    return this.promoEvents.update(user.tenantId, user.id, user.role, eventId, body);
  }

  @Post('promo-events/:eventId/submit')
  submit(@CurrentUser() user: AuthUser, @Param('eventId') eventId: string) {
    return this.promoEvents.submit(user.tenantId, user.id, user.role, eventId);
  }

  @Post('promo-events/:eventId/archive')
  archive(@CurrentUser() user: AuthUser, @Param('eventId') eventId: string) {
    return this.promoEvents.archive(user.tenantId, user.id, user.role, eventId);
  }
}
