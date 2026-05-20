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
  Role,
  adminExcursionOperatorsListQuerySchema,
  createExcursionOperatorBodySchema,
  createExcursionProductBodySchema,
  excursionOperatorIdParamsSchema,
  excursionProductIdParamsSchema,
  updateExcursionOperatorBodySchema,
  updateExcursionProductBodySchema,
  type AdminExcursionOperatorsListQuery,
  type CreateExcursionOperatorBody,
  type CreateExcursionProductBody,
  type ExcursionOperatorIdParams,
  type ExcursionProductIdParams,
  type UpdateExcursionOperatorBody,
  type UpdateExcursionProductBody,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ExcursionOperatorsService } from './excursion-operators.service';

@Controller('admin/excursion-operators')
@UseGuards(JwtOrDevAuthGuard, RolesGuard)
@RequireRole(Role.ADMIN)
export class AdminExcursionOperatorsController {
  constructor(private readonly excursionOperators: ExcursionOperatorsService) {}

  @Get()
  async list(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(adminExcursionOperatorsListQuerySchema))
    query: AdminExcursionOperatorsListQuery,
  ) {
    return this.excursionOperators.listAdmin(user.tenantId, query);
  }

  @Get(':id')
  async getOne(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(excursionOperatorIdParamsSchema))
    params: ExcursionOperatorIdParams,
  ) {
    return this.excursionOperators.getAdmin(user.tenantId, params.id);
  }

  @Post()
  async create(
    @CurrentUser() user: { tenantId: string },
    @Body(new ZodValidationPipe(createExcursionOperatorBodySchema))
    body: CreateExcursionOperatorBody,
  ) {
    return this.excursionOperators.create(user.tenantId, body);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(excursionOperatorIdParamsSchema))
    params: ExcursionOperatorIdParams,
    @Body(new ZodValidationPipe(updateExcursionOperatorBodySchema))
    body: UpdateExcursionOperatorBody,
  ) {
    return this.excursionOperators.update(user.tenantId, params.id, body);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(excursionOperatorIdParamsSchema))
    params: ExcursionOperatorIdParams,
  ) {
    return this.excursionOperators.remove(user.tenantId, params.id);
  }

  @Post(':id/excursions')
  async createExcursion(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param(new ZodValidationPipe(excursionOperatorIdParamsSchema))
    params: ExcursionOperatorIdParams,
    @Body(new ZodValidationPipe(createExcursionProductBodySchema))
    body: CreateExcursionProductBody,
  ) {
    return this.excursionOperators.createExcursion(
      user.tenantId,
      params.id,
      user.id,
      body,
    );
  }

  @Patch(':id/excursions/:excursionId')
  async updateExcursion(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(excursionProductIdParamsSchema))
    params: ExcursionProductIdParams,
    @Body(new ZodValidationPipe(updateExcursionProductBodySchema))
    body: UpdateExcursionProductBody,
  ) {
    return this.excursionOperators.updateExcursion(
      user.tenantId,
      params.id,
      params.excursionId,
      body,
    );
  }
}
