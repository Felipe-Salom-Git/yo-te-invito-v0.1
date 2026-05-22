import { Controller, Get, Post, Query, Param, UseGuards } from '@nestjs/common';
import {
  eventsListQuerySchema,
  eventsSearchQuerySchema,
  eventsTrendingQuerySchema,
  eventsRecommendedQuerySchema,
  type EventsRecommendedQuery,
  eventsCalendarMonthQuerySchema,
  eventDetailQuerySchema,
  publicEventViewQuerySchema,
  type PublicEventViewQuery,
  type EventsListQuery,
  type EventsSearchQuery,
  type EventsTrendingQuery,
  type EventsCalendarMonthQuery,
  type EventDetailQuery,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { OptionalJwtOrDevAuthGuard } from '../auth/optional-jwt-or-dev-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PublicEventsService } from './public-events.service';
import { PublicEngagementService } from './public-engagement.service';

@Controller('public/events')
export class PublicEventsController {
  constructor(
    private readonly service: PublicEventsService,
    private readonly engagement: PublicEngagementService,
  ) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(eventsListQuerySchema)) query: EventsListQuery,
  ) {
    return this.service.list(query);
  }

  @Get('search')
  async search(
    @Query(new ZodValidationPipe(eventsSearchQuerySchema)) query: EventsSearchQuery,
  ) {
    return this.service.search(query);
  }

  @Get('recommended')
  async recommended(
    @Query(new ZodValidationPipe(eventsRecommendedQuerySchema)) query: EventsRecommendedQuery,
  ) {
    return this.service.recommended(query);
  }

  @Get('trending')
  async trending(
    @Query(new ZodValidationPipe(eventsTrendingQuerySchema)) query: EventsTrendingQuery,
  ) {
    return this.service.trending(query);
  }

  @Get('calendar')
  async calendar(
    @Query(new ZodValidationPipe(eventsCalendarMonthQuerySchema)) query: EventsCalendarMonthQuery,
  ) {
    return { data: await this.service.listCalendarMonth(query) };
  }

  /** Public active gastro promos for an approved event (empty if not gastro). */
  @Get(':id/discounts')
  async listGastroDiscounts(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(eventDetailQuerySchema)) query: EventDetailQuery,
  ) {
    return this.service.listPublicGastroDiscounts(id, query.tenantId);
  }

  @Get(':id')
  async detail(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(eventDetailQuerySchema)) query: EventDetailQuery,
  ) {
    return this.service.detail(id, query.tenantId);
  }

  /** Increment public view counter (V2: no per-user dedup). */
  @Post(':id/view')
  @UseGuards(OptionalJwtOrDevAuthGuard)
  async recordView(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(publicEventViewQuerySchema)) query: PublicEventViewQuery,
    @CurrentUser() user?: { id: string; tenantId: string; role: string },
  ) {
    return this.engagement.recordEventView(query.tenantId, id, user);
  }
}
