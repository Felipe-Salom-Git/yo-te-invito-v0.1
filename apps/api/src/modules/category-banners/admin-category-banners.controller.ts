import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  categoryBannerCategoryParamsSchema,
  categoryBannerItemIdParamsSchema,
  getCategoryBannersQuerySchema,
  updateCategoryBannerItemsSchema,
  type CategoryBannerCategoryParams,
  type CategoryBannerItemIdParams,
  type GetCategoryBannersQuery,
  type UpdateCategoryBannerItemsBody,
  Role,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CategoryBannersService } from './category-banners.service';

@Controller('admin/category-banners')
@UseGuards(JwtOrDevAuthGuard, RolesGuard)
@RequireRole(Role.ADMIN)
export class AdminCategoryBannersController {
  constructor(private readonly categoryBanners: CategoryBannersService) {}

  @Get()
  async list(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(getCategoryBannersQuerySchema))
    query: GetCategoryBannersQuery,
  ) {
    return this.categoryBanners.getAdmin(user.tenantId, query.category);
  }

  @Put(':category')
  async replace(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(categoryBannerCategoryParamsSchema))
    params: CategoryBannerCategoryParams,
    @Body(new ZodValidationPipe(updateCategoryBannerItemsSchema))
    body: UpdateCategoryBannerItemsBody,
  ) {
    return this.categoryBanners.replaceAdmin(user.tenantId, params.category, body);
  }

  @Delete(':category/:itemId')
  async remove(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(categoryBannerItemIdParamsSchema))
    params: CategoryBannerItemIdParams,
  ) {
    return this.categoryBanners.removeAdminItem(
      user.tenantId,
      params.category,
      params.itemId,
    );
  }
}
