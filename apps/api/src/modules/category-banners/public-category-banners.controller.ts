import { Controller, Get, Query } from '@nestjs/common';
import {
  publicCategoryBannersQuerySchema,
  type PublicCategoryBannersQuery,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CategoryBannersService } from './category-banners.service';

@Controller('public/category-banners')
export class PublicCategoryBannersController {
  constructor(private readonly categoryBanners: CategoryBannersService) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(publicCategoryBannersQuerySchema))
    query: PublicCategoryBannersQuery,
  ) {
    return this.categoryBanners.getPublic(query.tenantId, query.category);
  }
}
