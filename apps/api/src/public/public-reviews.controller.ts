import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  reviewsListQuerySchema,
  type ReviewsListQuery,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ReviewsService } from '../modules/reviews/reviews.service';

@Controller('public/events')
export class PublicReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get(':id/reviews')
  async list(
    @Param('id') eventId: string,
    @Query(new ZodValidationPipe(reviewsListQuerySchema)) query: ReviewsListQuery,
  ) {
    return this.reviews.listPublic(eventId, query.tenantId, {
      page: query.page,
      limit: query.limit,
    });
  }
}
