import { Controller, Get, Query } from '@nestjs/common';
import {
  publicCategoryEditorialBannersQuerySchema,
  type PublicCategoryEditorialBannersQuery,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CategoryEditorialBannersService } from './category-editorial-banners.service';

@Controller('public/category-editorial-banners')
export class PublicCategoryEditorialBannersController {
  constructor(private readonly editorialBanners: CategoryEditorialBannersService) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(publicCategoryEditorialBannersQuerySchema))
    query: PublicCategoryEditorialBannersQuery,
  ) {
    return this.editorialBanners.listPublic(query.tenantId, query.category);
  }
}
