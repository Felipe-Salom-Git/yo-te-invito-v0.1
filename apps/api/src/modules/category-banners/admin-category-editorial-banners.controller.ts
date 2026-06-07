import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  categoryEditorialBannerIdParamsSchema,
  createCategoryEditorialBannerBodySchema,
  listCategoryEditorialBannersQuerySchema,
  reorderCategoryEditorialBannerBodySchema,
  updateCategoryEditorialBannerBodySchema,
  type CategoryEditorialBannerIdParams,
  type CreateCategoryEditorialBannerBody,
  type ListCategoryEditorialBannersQuery,
  type ReorderCategoryEditorialBannerBody,
  type UpdateCategoryEditorialBannerBody,
  Role,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CategoryEditorialBannersService } from './category-editorial-banners.service';

@Controller('admin/category-editorial-banners')
@UseGuards(JwtOrDevAuthGuard, RolesGuard)
@RequireRole(Role.ADMIN)
export class AdminCategoryEditorialBannersController {
  constructor(private readonly editorialBanners: CategoryEditorialBannersService) {}

  @Get()
  async list(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(listCategoryEditorialBannersQuerySchema))
    query: ListCategoryEditorialBannersQuery,
  ) {
    return this.editorialBanners.listAdmin(user.tenantId, query.category);
  }

  @Post()
  async create(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Body(new ZodValidationPipe(createCategoryEditorialBannerBodySchema))
    body: CreateCategoryEditorialBannerBody,
  ) {
    return this.editorialBanners.create(user.tenantId, user, body);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(categoryEditorialBannerIdParamsSchema))
    params: CategoryEditorialBannerIdParams,
    @Body(new ZodValidationPipe(updateCategoryEditorialBannerBodySchema))
    body: UpdateCategoryEditorialBannerBody,
  ) {
    return this.editorialBanners.update(user.tenantId, user, params.id, body);
  }

  @Post(':id/reorder')
  async reorder(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(categoryEditorialBannerIdParamsSchema))
    params: CategoryEditorialBannerIdParams,
    @Body(new ZodValidationPipe(reorderCategoryEditorialBannerBodySchema))
    body: ReorderCategoryEditorialBannerBody,
  ) {
    return this.editorialBanners.reorder(user.tenantId, user, params.id, body);
  }
}
