import { Controller, Get, Query } from '@nestjs/common';
import {
  publicPlatformConfigQuerySchema,
  type PublicPlatformConfigQuery,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PublicPlatformConfigService } from './public-platform-config.service';

@Controller('public/platform-config')
export class PublicPlatformConfigController {
  constructor(private readonly service: PublicPlatformConfigService) {}

  @Get()
  getPublic(
    @Query(new ZodValidationPipe(publicPlatformConfigQuerySchema))
    query: PublicPlatformConfigQuery,
  ) {
    return this.service.getPublic(query.tenantId);
  }
}
