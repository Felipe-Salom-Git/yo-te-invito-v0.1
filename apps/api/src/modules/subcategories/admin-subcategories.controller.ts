import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  adminSubcategoriesListQuerySchema,
  createSubcategoryBodySchema,
  subcategoryIdParamsSchema,
  updateSubcategoryBodySchema,
  type AdminSubcategoriesListQuery,
  type CreateSubcategoryBody,
  type SubcategoryIdParams,
  type UpdateSubcategoryBody,
  Role,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SubcategoriesService } from './subcategories.service';

@Controller('admin/subcategories')
@UseGuards(JwtOrDevAuthGuard, RolesGuard)
@RequireRole(Role.ADMIN)
export class AdminSubcategoriesController {
  constructor(private readonly subcategories: SubcategoriesService) {}

  @Get()
  async list(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(adminSubcategoriesListQuerySchema))
    query: AdminSubcategoriesListQuery,
  ) {
    return this.subcategories.listAdmin(user.tenantId, query);
  }

  @Post()
  async create(
    @CurrentUser() user: { tenantId: string },
    @Body(new ZodValidationPipe(createSubcategoryBodySchema)) body: CreateSubcategoryBody,
  ) {
    return this.subcategories.create(user.tenantId, body);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(subcategoryIdParamsSchema)) params: SubcategoryIdParams,
    @Body(new ZodValidationPipe(updateSubcategoryBodySchema)) body: UpdateSubcategoryBody,
  ) {
    return this.subcategories.update(user.tenantId, params.id, body);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(subcategoryIdParamsSchema)) params: SubcategoryIdParams,
  ) {
    return this.subcategories.remove(user.tenantId, params.id);
  }
}
