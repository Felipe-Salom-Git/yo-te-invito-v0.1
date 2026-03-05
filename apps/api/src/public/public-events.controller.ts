import { Controller, Get, Query, Param } from '@nestjs/common';
import {
  eventsListQuerySchema,
  eventDetailQuerySchema,
  type EventsListQuery,
  type EventDetailQuery,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PublicEventsService } from './public-events.service';

@Controller('public/events')
export class PublicEventsController {
  constructor(private readonly service: PublicEventsService) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(eventsListQuerySchema)) query: EventsListQuery,
  ) {
    return this.service.list(query);
  }

  @Get(':id')
  async detail(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(eventDetailQuerySchema)) query: EventDetailQuery,
  ) {
    return this.service.detail(id, query.tenantId);
  }
}
