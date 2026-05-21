import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  meCreatePublicReviewBodySchema,
  type MeCreatePublicReviewBody,
} from '@yo-te-invito/shared';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PublicReviewsService } from './public-reviews.service';

@Controller('me')
@UseGuards(JwtOrDevAuthGuard)
export class MeReviewsController {
  constructor(private readonly publicReviews: PublicReviewsService) {}

  @Post('reviews')
  async create(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(meCreatePublicReviewBodySchema))
    body: MeCreatePublicReviewBody,
  ) {
    const { eventId, ...reviewBody } = body;
    return this.publicReviews.createForAuthenticatedUser(user, eventId, reviewBody);
  }
}
