import { Controller, Get, Param, Query } from '@nestjs/common';
import { PublicHotelLocationsService } from './public-hotel-locations.service';

@Controller('public/hotel-locations')
export class PublicHotelLocationsController {
  constructor(private readonly service: PublicHotelLocationsService) {}

  @Get('by-event/:eventId')
  async getByPublicEventId(
    @Query('tenantId') tenantId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.service.getByPublicEventId(tenantId, eventId);
  }

  @Get(':id')
  async getById(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.service.getById(tenantId, id);
  }
}
