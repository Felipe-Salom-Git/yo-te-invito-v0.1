import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  publicGastroLocationsListQuerySchema,
  type PublicGastroLocationsListQuery,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PublicGastroLocationsService } from './public-gastro-locations.service';

@Controller('public/gastro-locations')
export class PublicGastroLocationsController {
  constructor(private readonly service: PublicGastroLocationsService) {}

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

  @Get(':id')
  async getById(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.getById(tenantId, id);
  }
}
