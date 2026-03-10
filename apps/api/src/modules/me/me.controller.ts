import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  meTicketsQuerySchema,
  meOrdersQuerySchema,
  userPreferencesPatchSchema,
  requestCommissionBodySchema,
  type MeTicketsQuery,
  type MeOrdersQuery,
  type UserPreferencesPatch,
  type RequestCommissionBody,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MeService } from './me.service';
import { ReferralsService } from '../referrals/referrals.service';

@Controller('me')
@UseGuards(JwtOrDevAuthGuard)
export class MeController {
  constructor(
    private readonly meService: MeService,
    private readonly referralsService: ReferralsService,
  ) {}

  @Get()
  async getMe(
    @CurrentUser() user: { id: string; tenantId: string },
  ) {
    return this.meService.getMe(user.tenantId, user.id);
  }

  @Get('tickets')
  async getMyTickets(
    @CurrentUser() user: { id: string; tenantId: string },
    @Query(new ZodValidationPipe(meTicketsQuerySchema)) _query: MeTicketsQuery,
  ) {
    return this.meService.getMyTickets(user.tenantId, user.id);
  }

  @Get('orders')
  async getMyOrders(
    @CurrentUser() user: { id: string; tenantId: string },
    @Query(new ZodValidationPipe(meOrdersQuerySchema)) query: MeOrdersQuery,
  ) {
    return this.meService.getMyOrders(user.tenantId, user.id, query);
  }

  @Get('preferences')
  async getPreferences(
    @CurrentUser() user: { id: string; tenantId: string },
  ) {
    return this.meService.getPreferences(user.tenantId, user.id);
  }

  @Patch('preferences')
  async updatePreferences(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(userPreferencesPatchSchema)) body: UserPreferencesPatch,
  ) {
    return this.meService.updatePreferences(user.tenantId, user.id, body);
  }

  @Get('referral-links')
  async getMyReferralLinks(
    @CurrentUser() user: { id: string; tenantId: string },
  ) {
    return this.referralsService.listByReferrer(user.tenantId, user.id);
  }

  @Get('commissions')
  async getMyCommissions(
    @CurrentUser() user: { id: string },
  ) {
    return { commissions: await this.referralsService.listCommissionsByUser(user.id) };
  }

  @Post('commissions/request')
  async requestCommission(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(requestCommissionBodySchema)) body: RequestCommissionBody,
  ) {
    return this.referralsService.requestCommission(user.tenantId, user.id, body.referralLinkId);
  }
}
