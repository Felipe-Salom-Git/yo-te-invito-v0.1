import {
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  transferTicketParamsSchema,
  transferTicketBodySchema,
  type TransferTicketParams,
  type TransferTicketBody,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TicketTransferService } from './ticket-transfer.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly transferService: TicketTransferService) {}

  @Post(':ticketId/transfer')
  @UseGuards(JwtOrDevAuthGuard)
  async transfer(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param(new ZodValidationPipe(transferTicketParamsSchema))
    params: TransferTicketParams,
    @Body(new ZodValidationPipe(transferTicketBodySchema))
    body: TransferTicketBody,
  ) {
    return this.transferService.transfer(
      user.id,
      user.tenantId,
      params.ticketId,
      body,
    );
  }
}
