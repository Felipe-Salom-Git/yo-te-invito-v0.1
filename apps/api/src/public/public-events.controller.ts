import { Controller, Get, Post, Query, Param, UseGuards } from '@nestjs/common';
import {
  eventsListQuerySchema,
  eventsSearchQuerySchema,
  eventsSuggestionsQuerySchema,
  eventsTrendingQuerySchema,
  eventsRecommendedQuerySchema,
  type EventsRecommendedQuery,
  eventsCalendarMonthQuerySchema,
  eventDetailQuerySchema,
  publicEventViewQuerySchema,
  type PublicEventViewQuery,
  type EventsListQuery,
  type EventsSearchQuery,
  type EventsSuggestionsQuery,
  type EventsTrendingQuery,
  type EventsCalendarMonthQuery,
  type EventDetailQuery,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { OptionalJwtOrDevAuthGuard } from '../auth/optional-jwt-or-dev-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PublicEventsService } from './public-events.service';
import { PublicEngagementService } from './public-engagement.service';

type AuthedUser = { id: string; tenantId: string; role: string };

/** Pass JWT role so coming-soon preview is evaluated per category. */
function publicCategoryAccess(user?: AuthedUser) {
  return { role: user?.role ?? null };
}

@Controller('public/events')
export class PublicEventsController {
  constructor(
    private readonly service: PublicEventsService,
    private readonly engagement: PublicEngagementService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtOrDevAuthGuard)
  async list(
    @Query(new ZodValidationPipe(eventsListQuerySchema)) query: EventsListQuery,
    @CurrentUser() user?: AuthedUser,
  ) {
    return this.service.list(query, publicCategoryAccess(user));
  }

  @Get('search')
  @UseGuards(OptionalJwtOrDevAuthGuard)
  async search(
    @Query(new ZodValidationPipe(eventsSearchQuerySchema)) query: EventsSearchQuery,
    @CurrentUser() user?: AuthedUser,
  ) {
    return this.service.search(query, publicCategoryAccess(user));
  }

  @Get('suggestions')
  @UseGuards(OptionalJwtOrDevAuthGuard)
  async suggestions(
    @Query(new ZodValidationPipe(eventsSuggestionsQuerySchema)) query: EventsSuggestionsQuery,
    @CurrentUser() user?: AuthedUser,
  ) {
    return this.service.suggestions(query, publicCategoryAccess(user));
  }

  @Get('recommended')
  @UseGuards(OptionalJwtOrDevAuthGuard)
  async recommended(
    @Query(new ZodValidationPipe(eventsRecommendedQuerySchema)) query: EventsRecommendedQuery,
    @CurrentUser() user?: AuthedUser,
  ) {
    return this.service.recommended(query, publicCategoryAccess(user));
  }

  @Get('trending')
  @UseGuards(OptionalJwtOrDevAuthGuard)
  async trending(
    @Query(new ZodValidationPipe(eventsTrendingQuerySchema)) query: EventsTrendingQuery,
    @CurrentUser() user?: AuthedUser,
  ) {
    return this.service.trending(query, publicCategoryAccess(user));
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
  @UseGuards(OptionalJwtOrDevAuthGuard)
  async detail(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(eventDetailQuerySchema)) query: EventDetailQuery,
    @CurrentUser() user?: AuthedUser,
  ) {
    return this.service.detail(id, query.tenantId, publicCategoryAccess(user));
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
