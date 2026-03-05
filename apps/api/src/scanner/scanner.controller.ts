import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  validateTicketQuerySchema,
  validateTicketBodySchema,
  scanBodySchema,
  eventTicketsParamsSchema,
  type ValidateTicketQuery,
  type ValidateTicketBody,
  type ScanBody,
  type EventTicketsParams,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { DevAuthGuard } from '../common/guards/dev-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRole } from '../common/decorators/require-role.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@yo-te-invito/shared';
import { ScannerService } from './scanner.service';

@Controller('scanner')
export class ScannerController {
  constructor(private readonly service: ScannerService) {}

  @Post('validate')
  async validate(
    @Query(new ZodValidationPipe(validateTicketQuerySchema))
    query: ValidateTicketQuery,
    @Body(new ZodValidationPipe(validateTicketBodySchema)) body: ValidateTicketBody,
  ) {
    return this.service.validate(query, body);
  }

  @Get('events/:eventId/tickets')
  @UseGuards(DevAuthGuard, RolesGuard)
  @RequireRole(Role.SCANNER)
  async getEventTickets(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(eventTicketsParamsSchema)) params: EventTicketsParams,
  ) {
    return this.service.getEventTickets(user.tenantId, params.eventId);
  }

  @Post('scan')
  @UseGuards(DevAuthGuard, RolesGuard)
  @RequireRole(Role.SCANNER)
  async scan(
    @CurrentUser() user: { tenantId: string; id: string },
    @Body(new ZodValidationPipe(scanBodySchema)) body: ScanBody,
  ) {
    return this.service.scan(user.tenantId, user.id, body);
  }
}
