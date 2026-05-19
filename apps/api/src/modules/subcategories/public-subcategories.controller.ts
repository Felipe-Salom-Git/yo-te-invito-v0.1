import { Controller, Get, Query } from '@nestjs/common';
import {
  publicSubcategoriesQuerySchema,
  type PublicSubcategoriesQuery,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SubcategoriesService } from './subcategories.service';

@Controller('public/subcategories')
export class PublicSubcategoriesController {
  constructor(private readonly subcategories: SubcategoriesService) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(publicSubcategoriesQuerySchema))
    query: PublicSubcategoriesQuery,
  ) {
    return this.subcategories.listPublic(query);
  }
}
