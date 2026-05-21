import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  acceptTicketTransferOfferParamsSchema,
  cancelTicketTransferOfferParamsSchema,
  createTicketTransferOfferBodySchema,
  createTicketTransferOfferParamsSchema,
  meTicketTransferOffersQuerySchema,
  rejectTicketTransferOfferParamsSchema,
  ticketTransferLookupParamsSchema,
} from '@yo-te-invito/shared';
import type {
  CreateTicketTransferOfferBody,
  MeTicketTransferOffersQuery,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TicketTransferOfferService } from './ticket-transfer-offer.service';

@Controller('me')
@UseGuards(JwtOrDevAuthGuard)
export class MeTicketTransferController {
  constructor(private readonly transfers: TicketTransferOfferService) {}

  @Get('ticket-transfer-offers')
  list(
    @CurrentUser() user: { id: string; tenantId: string },
    @Query(new ZodValidationPipe(meTicketTransferOffersQuerySchema))
    query: MeTicketTransferOffersQuery,
  ) {
    return this.transfers.listForUser(user.tenantId, user.id, query);
  }

  @Post('tickets/:ticketId/transfer-offers')
  create(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param(new ZodValidationPipe(createTicketTransferOfferParamsSchema))
    params: { ticketId: string },
    @Body(new ZodValidationPipe(createTicketTransferOfferBodySchema))
    body: CreateTicketTransferOfferBody,
  ) {
    return this.transfers.create(user.tenantId, user.id, params.ticketId, body);
  }

  @Get('ticket-transfer-offers/lookup/:token')
  lookup(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param(new ZodValidationPipe(ticketTransferLookupParamsSchema))
    params: { token: string },
  ) {
    return this.transfers.lookupByToken(user.tenantId, user.id, params.token);
  }

  @Post('ticket-transfer-offers/:offerId/reject')
  reject(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param(new ZodValidationPipe(rejectTicketTransferOfferParamsSchema))
    params: { offerId: string },
  ) {
    return this.transfers.reject(user.tenantId, user.id, params.offerId);
  }

  @Post('ticket-transfer-offers/:offerId/cancel')
  cancel(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param(new ZodValidationPipe(cancelTicketTransferOfferParamsSchema))
    params: { offerId: string },
  ) {
    return this.transfers.cancel(user.tenantId, user.id, params.offerId);
  }

  @Post('ticket-transfer-offers/:token/accept')
  accept(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param(new ZodValidationPipe(acceptTicketTransferOfferParamsSchema))
    params: { token: string },
  ) {
    return this.transfers.accept(user.tenantId, user.id, params.token);
  }
}
