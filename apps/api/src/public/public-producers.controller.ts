import { Controller, Get, Param, Query } from '@nestjs/common';
import { PublicProducersService } from './public-producers.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { getProducersQuerySchema, type GetProducersQuery } from '@yo-te-invito/shared';

@Controller('public/producers')
export class PublicProducersController {
  constructor(private readonly service: PublicProducersService) { }

  @Get()
  async list(@Query(new ZodValidationPipe(getProducersQuerySchema)) query: GetProducersQuery) {
    return this.service.getPublicList(query.page, query.limit, query.city);
  }

  @Get(':slug')
  async getBySlug(@Param('slug') slug: string) {
    return this.service.getBySlugOrId(slug);
  }
}
