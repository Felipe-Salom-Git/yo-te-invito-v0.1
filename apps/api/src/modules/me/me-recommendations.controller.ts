import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { meRecommendationsQuerySchema } from '@yo-te-invito/shared';
import type { MeRecommendationsQuery } from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MeRecommendationsService } from './me-recommendations.service';

@Controller('me')
@UseGuards(JwtOrDevAuthGuard)
export class MeRecommendationsController {
  constructor(private readonly recommendations: MeRecommendationsService) {}

  @Get('recommendations')
  list(
    @CurrentUser() user: { id: string; tenantId: string },
    @Query(new ZodValidationPipe(meRecommendationsQuerySchema)) query: MeRecommendationsQuery,
  ) {
    return this.recommendations.getRecommendations(user.tenantId, user.id, query);
  }
}
