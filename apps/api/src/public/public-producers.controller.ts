import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { PublicProducersService } from './public-producers.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  getProducersQuerySchema,
  producerReviewsListQuerySchema,
  type GetProducersQuery,
  type ProducerReviewsListQuery,
} from '@yo-te-invito/shared';

@Controller('public/producers')
export class PublicProducersController {
  constructor(private readonly service: PublicProducersService) {}

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
}
