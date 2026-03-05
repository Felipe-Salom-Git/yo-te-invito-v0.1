import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  createReviewParamsSchema,
  createReviewBodySchema,
  type CreateReviewParams,
  type CreateReviewBody,
  type ReviewsResponse,
} from '@yo-te-invito/shared';
import {
  reviewsListQuerySchema,
  type ReviewsListQuery,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DevAuthGuard } from '../../common/guards/dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';

@Controller()
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Post('events/:eventId/reviews')
  @UseGuards(DevAuthGuard)
  async create(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param(new ZodValidationPipe(createReviewParamsSchema)) params: CreateReviewParams,
    @Body(new ZodValidationPipe(createReviewBodySchema)) body: CreateReviewBody,
  ): Promise<{ id: string }> {
    return this.service.create(user.tenantId, user.id, params.eventId, body);
  }
}
