import { Body, Controller, GoneException, Param, Post, UseGuards } from '@nestjs/common';
import {
  transferTicketParamsSchema,
  transferTicketBodySchema,
  type TransferTicketParams,
  type TransferTicketBody,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('tickets')
export class TicketsController {
  /** @deprecated Use POST /me/tickets/:ticketId/transfer-offers */
  @Post(':ticketId/transfer')
  @UseGuards(JwtOrDevAuthGuard)
  transfer(
    @CurrentUser() _user: { id: string; tenantId: string },
    @Param(new ZodValidationPipe(transferTicketParamsSchema))
    _params: TransferTicketParams,
    @Body(new ZodValidationPipe(transferTicketBodySchema))
    _body: TransferTicketBody,
  ) {
    throw new GoneException({
      message:
        'Direct ticket transfer was removed. Use POST /me/tickets/:ticketId/transfer-offers to start a transfer offer.',
      replacement: '/me/tickets/:ticketId/transfer-offers',
    });
  }
}
