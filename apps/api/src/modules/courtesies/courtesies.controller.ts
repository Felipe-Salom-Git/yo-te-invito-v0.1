import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  createCourtesyParamsSchema,
  createCourtesyBodySchema,
  type CreateCourtesyParams,
  type CreateCourtesyBody,
  type CreateCourtesyResponse,
  type CourtesyGrantSummary,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@yo-te-invito/shared';
import { CourtesiesService } from './courtesies.service';

@Controller('events')
export class CourtesiesController {
  constructor(private readonly service: CourtesiesService) {}

  @Post(':eventId/courtesies')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
  async create(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param(new ZodValidationPipe(createCourtesyParamsSchema)) params: CreateCourtesyParams,
    @Body(new ZodValidationPipe(createCourtesyBodySchema)) body: CreateCourtesyBody,
  ): Promise<CreateCourtesyResponse> {
    return this.service.create(user.tenantId, user.id, params.eventId, body);
  }

  @Get(':eventId/ticket-types')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
  async getTicketTypes(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(createCourtesyParamsSchema)) params: CreateCourtesyParams,
  ) {
    return this.service.getTicketTypes(user.tenantId, params.eventId);
  }

  @Get(':eventId/courtesies')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
  async list(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(createCourtesyParamsSchema)) params: CreateCourtesyParams,
  ): Promise<{ grants: CourtesyGrantSummary[] }> {
    return this.service.list(user.tenantId, params.eventId);
  }
}