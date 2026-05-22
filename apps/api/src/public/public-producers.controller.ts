import { Controller, Get, Post, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { PublicProducersService } from './public-producers.service';
import { PublicEngagementService } from './public-engagement.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { OptionalJwtOrDevAuthGuard } from '../auth/optional-jwt-or-dev-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { eventDetailQuerySchema, type EventDetailQuery } from '@yo-te-invito/shared';
import {
  getProducersQuerySchema,
  producerReviewsListQuerySchema,
  type GetProducersQuery,
  type ProducerReviewsListQuery,
} from '@yo-te-invito/shared';

@Controller('public/producers')
export class PublicProducersController {
  constructor(
    private readonly service: PublicProducersService,
    private readonly engagement: PublicEngagementService,
  ) {}

  @Get()
  async list(@Query(new ZodValidationPipe(getProducersQuerySchema)) query: GetProducersQuery) {
    return this.service.getPublicList(query.page, query.limit, query.city);
  }

  @Get(':slug/reviews-summary')
  async reviewsSummary(@Param('slug') slug: string) {
    const summary = await this.service.getReviewsSummary(slug);
    if (!summary) throw new NotFoundException('Producer not found');
    return summary;
  }

  @Get(':slug/reviews')
  async reviews(
    @Param('slug') slug: string,
    @Query(new ZodValidationPipe(producerReviewsListQuerySchema)) query: ProducerReviewsListQuery,
  ) {
    const result = await this.service.listReviews(slug, query);
    if (!result) throw new NotFoundException('Producer not found');
    return result;
  }

  @Get(':slug')
  async getBySlug(@Param('slug') slug: string) {
    const producer = await this.service.getBySlugOrId(slug);
    if (!producer) throw new NotFoundException('Producer not found');
    return producer;
  }

  /** Increment public profile view counter (V2: no per-user dedup). */
  @Post(':slug/view')
  @UseGuards(OptionalJwtOrDevAuthGuard)
  async recordView(
    @Param('slug') slug: string,
    @Query(new ZodValidationPipe(eventDetailQuerySchema)) query: EventDetailQuery,
    @CurrentUser() user?: { id: string; tenantId: string; role: string },
  ) {
    return this.engagement.recordProducerProfileView(query.tenantId, slug, user);
  }
}
