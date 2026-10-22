import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  publicGastroLocationsListQuerySchema,
  publicGastroProfileViewQuerySchema,
  type PublicGastroLocationsListQuery,
  type PublicGastroProfileViewQuery,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { OptionalJwtOrDevAuthGuard } from '../auth/optional-jwt-or-dev-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PublicGastroLocationsService } from './public-gastro-locations.service';
import { PublicEngagementService } from './public-engagement.service';

@Controller('public/gastro-locations')
export class PublicGastroLocationsController {
  constructor(
    private readonly service: PublicGastroLocationsService,
    private readonly engagement: PublicEngagementService,
  ) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(publicGastroLocationsListQuerySchema))
    query: PublicGastroLocationsListQuery,
  ) {
    return this.service.list(query);
  }

  @Get('by-event/:eventId')
  async getByPublicEventId(
    @Query('tenantId') tenantId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.service.getByPublicEventId(tenantId, eventId);
  }

  @Get(':id/discounts')
  async listDiscounts(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.listDiscounts(tenantId, id);
  }

  /** Record one public page view for this GastroProfile (client once-per-mount). */
  @Post(':id/view')
  @UseGuards(OptionalJwtOrDevAuthGuard)
  async recordView(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(publicGastroProfileViewQuerySchema))
    query: PublicGastroProfileViewQuery,
    @CurrentUser() user?: { id: string; tenantId: string; role: string },
  ) {
    return this.engagement.recordGastroProfileView(query.tenantId, id, user);
  }

  @Get(':id')
  async getById(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.getById(tenantId, id);
  }
}
