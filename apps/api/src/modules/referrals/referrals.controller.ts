import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  createReferralLinkParamsSchema,
  createReferralLinkBodySchema,
  assignReferralsBodySchema,
  type CreateReferralLinkParams,
  type CreateReferralLinkBody,
  type CreateReferralLinkResponse,
  type ReferralLinkSummary,
  type AssignReferralsBody,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@yo-te-invito/shared';
import { ReferralsService } from './referrals.service';

@Controller()
export class ReferralsController {
  constructor(private readonly service: ReferralsService) {}

  @Post('events/:eventId/referral-links')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
  async create(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(createReferralLinkParamsSchema)) params: CreateReferralLinkParams,
    @Body(new ZodValidationPipe(createReferralLinkBodySchema)) body: CreateReferralLinkBody,
  ): Promise<CreateReferralLinkResponse> {
    return this.service.create(user.tenantId, params.eventId, body);
  }

  @Get('events/:eventId/referral-links')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
  async list(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(createReferralLinkParamsSchema)) params: CreateReferralLinkParams,
  ): Promise<{ links: ReferralLinkSummary[] }> {
    return this.service.list(user.tenantId, params.eventId);
  }

  @Put('events/:eventId/referrals')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
  async assignReferrers(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(createReferralLinkParamsSchema)) params: CreateReferralLinkParams,
    @Body(new ZodValidationPipe(assignReferralsBodySchema)) body: AssignReferralsBody,
  ): Promise<{ links: ReferralLinkSummary[] }> {
    return this.service.assignReferrersToEvent(user.tenantId, params.eventId, body);
  }
}

