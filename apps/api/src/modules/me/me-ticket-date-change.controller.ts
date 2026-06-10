import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  createTicketDateChangeRequestBodySchema,
  createTicketDateChangeRequestParamsSchema,
  ticketDateChangeOptionsParamsSchema,
  type CreateTicketDateChangeRequestBody,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TicketDateChangeService } from '../tickets/ticket-date-change.service';

@Controller('me')
@UseGuards(JwtOrDevAuthGuard)
export class MeTicketDateChangeController {
  constructor(private readonly dateChanges: TicketDateChangeService) {}

  @Get('tickets/:ticketId/date-change-options')
  getOptions(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param(new ZodValidationPipe(ticketDateChangeOptionsParamsSchema))
    params: { ticketId: string },
  ) {
    return this.dateChanges.getOptions(user.tenantId, user.id, params.ticketId);
  }

  @Post('tickets/:ticketId/date-change-requests')
  create(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param(new ZodValidationPipe(createTicketDateChangeRequestParamsSchema))
    params: { ticketId: string },
    @Body(new ZodValidationPipe(createTicketDateChangeRequestBodySchema))
    body: CreateTicketDateChangeRequestBody,
  ) {
    return this.dateChanges.createRequest(user.tenantId, user.id, params.ticketId, body);
  }

  @Get('tickets/:ticketId/date-change-history')
  history(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param(new ZodValidationPipe(ticketDateChangeOptionsParamsSchema))
    params: { ticketId: string },
  ) {
    return this.dateChanges.listHistoryForTicket(user.tenantId, user.id, params.ticketId);
  }
}
