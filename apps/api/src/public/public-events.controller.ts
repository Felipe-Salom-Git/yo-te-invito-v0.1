import { Controller, Get, Query } from '@nestjs/common';
import { eventsListQuerySchema, EventStatus } from '@yo-te-invito/shared';
import { PublicEventsService } from './public-events.service';

@Controller('public/events')
export class PublicEventsController {
  constructor(private readonly service: PublicEventsService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('city') city?: string,
    @Query('status') status?: string,
  ) {
    const parsed = eventsListQuerySchema.parse({
      page: page ?? '1',
      limit: limit ?? '10',
      city,
      status,
    });
    return this.service.list(parsed);
  }
}
