import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ReferrerRolesGuard } from '../../common/guards/referrer-roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { Role } from '@yo-te-invito/shared';
import {
  meTicketsQuerySchema,
  meOrdersQuerySchema,
  patchTicketReminderBodySchema,
  requestCommissionBodySchema,
  createGastroPromotionRequestBodySchema,
  createReviewModerationRequestBodySchema,
  type MeTicketsQuery,
  type MeOrdersQuery,
  type PatchTicketReminderBody,
  type RequestCommissionBody,
  type CreateGastroPromotionRequestBody,
  type CreateReviewModerationRequestBody,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MeService } from './me.service';
import { ReferralsService } from '../referrals/referrals.service';
import { InboxService } from '../inbox/inbox.service';

@Controller('me')
@UseGuards(JwtOrDevAuthGuard)
export class MeController {
  constructor(
    private readonly meService: MeService,
    private readonly referralsService: ReferralsService,
    private readonly inboxService: InboxService,
  ) {}

  @Get()
  async getMe(
    @CurrentUser() user: { id: string; tenantId: string },
  ) {
    return this.meService.getMe(user.tenantId, user.id);
  }

  @Get('tickets/:ticketId')
  async getMyTicket(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('ticketId') ticketId: string,
  ) {
    return this.meService.getMyTicketDetail(user.tenantId, user.id, ticketId);
  }

  @Patch('tickets/:ticketId/reminder')
  async patchTicketReminder(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('ticketId') ticketId: string,
    @Body(new ZodValidationPipe(patchTicketReminderBodySchema))
    body: PatchTicketReminderBody,
  ) {
    return this.meService.patchTicketReminder(user.tenantId, user.id, ticketId, body);
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

  @Get('referral-links')
  @UseGuards(ReferrerRolesGuard)
  @RequireRole(Role.ADMIN, Role.REFERRER)
  async getMyReferralLinks(
    @CurrentUser() user: { id: string; tenantId: string },
  ) {
    return this.referralsService.listByReferrer(user.tenantId, user.id);
  }

  @Get('commissions')
  @UseGuards(ReferrerRolesGuard)
  @RequireRole(Role.ADMIN, Role.REFERRER)
  async getMyCommissions(
    @CurrentUser() user: { id: string },
  ) {
    return { commissions: await this.referralsService.listCommissionsByUser(user.id) };
  }

  @Post('commissions/request')
  @UseGuards(ReferrerRolesGuard)
  @RequireRole(Role.ADMIN, Role.REFERRER)
  async requestCommission(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(requestCommissionBodySchema)) body: RequestCommissionBody,
  ) {
    return this.referralsService.requestCommission(user.tenantId, user.id, body.referralLinkId);
  }

  @Get('inbox')
  async getMyInbox(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.inboxService.listOutbound(user.tenantId, user.id);
  }

  @Post('inbox/gastro-promotion')
  async createGastroPromotionRequest(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(createGastroPromotionRequestBodySchema)) body: CreateGastroPromotionRequestBody,
  ) {
    return this.inboxService.createGastroPromotionRequest(user.tenantId, user.id, body);
  }

  @Post('inbox/review-moderation')
  async createReviewModerationRequest(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Body(new ZodValidationPipe(createReviewModerationRequestBodySchema)) body: CreateReviewModerationRequestBody,
  ) {
    return this.inboxService.createReviewModerationRequest(user.tenantId, user.id, user.role, body);
  }
}
