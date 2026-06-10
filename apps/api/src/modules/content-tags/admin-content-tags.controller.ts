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
  adminContentTagsListQuerySchema,
  contentTagIdParamsSchema,
  createContentTagBodySchema,
  updateContentTagBodySchema,
  type AdminContentTagsListQuery,
  type ContentTagIdParams,
  type CreateContentTagBody,
  type UpdateContentTagBody,
  Role,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ContentTagsService } from './content-tags.service';

@Controller('admin/tags')
@UseGuards(JwtOrDevAuthGuard, RolesGuard)
@RequireRole(Role.ADMIN)
export class AdminContentTagsController {
  constructor(private readonly tags: ContentTagsService) {}

  @Get()
  async list(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(adminContentTagsListQuerySchema))
    query: AdminContentTagsListQuery,
  ) {
    return this.tags.listAdmin(user.tenantId, query);
  }

  @Post()
  async create(
    @CurrentUser() user: { tenantId: string },
    @Body(new ZodValidationPipe(createContentTagBodySchema)) body: CreateContentTagBody,
  ) {
    return this.tags.create(user.tenantId, body);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(contentTagIdParamsSchema)) params: ContentTagIdParams,
    @Body(new ZodValidationPipe(updateContentTagBodySchema)) body: UpdateContentTagBody,
  ) {
    return this.tags.update(user.tenantId, params.id, body);
  }

  @Post(':id/archive')
  async archive(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(contentTagIdParamsSchema)) params: ContentTagIdParams,
  ) {
    return this.tags.setActive(user.tenantId, params.id, false);
  }

  @Post(':id/restore')
  async restore(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(contentTagIdParamsSchema)) params: ContentTagIdParams,
  ) {
    return this.tags.setActive(user.tenantId, params.id, true);
  }
}
