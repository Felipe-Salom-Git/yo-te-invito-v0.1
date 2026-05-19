import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  rentalLocationIdParamsSchema,
  type RentalLocationIdParams,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { RentalLocationsService } from './rental-locations.service';
import { z } from 'zod';

const publicRentalLocationQuerySchema = z.object({
  tenantId: z.string().min(1),
});

@Controller('public/rental-locations')
export class PublicRentalLocationsController {
  constructor(private readonly rentalLocations: RentalLocationsService) {}

  @Get(':id')
  async getDetail(
    @Param(new ZodValidationPipe(rentalLocationIdParamsSchema))
    params: RentalLocationIdParams,
    @Query(new ZodValidationPipe(publicRentalLocationQuerySchema))
    query: z.infer<typeof publicRentalLocationQuerySchema>,
  ) {
    return this.rentalLocations.getPublicDetail(query.tenantId, params.id);
  }
}
