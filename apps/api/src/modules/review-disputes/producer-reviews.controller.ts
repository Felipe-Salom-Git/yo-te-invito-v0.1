import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { ProducerRolesGuard } from '../../common/guards/producer-roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Role } from '@yo-te-invito/shared';
import {
  createReviewDisputeSchema,
  producerManagedReviewListQuerySchema,
  type CreateReviewDisputeInput,
  type ProducerManagedReviewListQuery,
} from '@yo-te-invito/shared';
import { ReviewDisputesService } from './review-disputes.service';

@Controller('producer')
@UseGuards(JwtOrDevAuthGuard, ProducerRolesGuard)
@RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
export class ProducerReviewsController {
  constructor(private readonly reviewDisputes: ReviewDisputesService) {}

  @Get('reviews/summary')
  getSummary(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.reviewDisputes.getProducerSummary(user.tenantId, user.id);
  }

  @Get('reviews')
  listReviews(
    @CurrentUser() user: { id: string; tenantId: string },
    @Query(new ZodValidationPipe(producerManagedReviewListQuerySchema)) query: ProducerManagedReviewListQuery,
  ) {
    return this.reviewDisputes.listProducerReviews(user.tenantId, user.id, query);
  }

  @Post('reviews/:reviewId/dispute')
  createDispute(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('reviewId') reviewId: string,
    @Body(new ZodValidationPipe(createReviewDisputeSchema)) body: CreateReviewDisputeInput,
  ) {
    return this.reviewDisputes.createDispute(
      user.tenantId,
      user.id,
      user.role,
      reviewId,
      body,
    );
  }

  @Get('review-disputes')
  listDisputes(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.reviewDisputes.listProducerDisputes(user.tenantId, user.id);
  }

  @Get('review-disputes/:id')
  getDispute(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') id: string,
  ) {
    return this.reviewDisputes.getProducerDispute(user.tenantId, user.id, id);
  }
}
