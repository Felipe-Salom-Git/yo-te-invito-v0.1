import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ticketTypesQuerySchema,
  type TicketTypesQuery,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PublicTicketTypesService } from './public-ticket-types.service';

@Controller('public/events/:eventId/ticket-types')
export class PublicTicketTypesController {
  constructor(private readonly service: PublicTicketTypesService) {}

  @Get()
  async list(
    @Param('eventId') eventId: string,
    @Query(new ZodValidationPipe(ticketTypesQuerySchema)) query: TicketTypesQuery,
  ) {
    return this.service.list(eventId, query.tenantId, query.occurrenceId);
  }
}
