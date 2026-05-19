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
  adminRentalLocationsListQuerySchema,
  createRentalLocationBodySchema,
  createRentalProductBodySchema,
  rentalLocationIdParamsSchema,
  updateRentalLocationBodySchema,
  updateRentalProductBodySchema,
  rentalProductIdParamsSchema,
  type AdminRentalLocationsListQuery,
  type CreateRentalLocationBody,
  type CreateRentalProductBody,
  type RentalLocationIdParams,
  type RentalProductIdParams,
  type UpdateRentalLocationBody,
  type UpdateRentalProductBody,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RentalLocationsService } from './rental-locations.service';

@Controller('admin/rental-locations')
@UseGuards(JwtOrDevAuthGuard, RolesGuard)
@RequireRole(Role.ADMIN)
export class AdminRentalLocationsController {
  constructor(private readonly rentalLocations: RentalLocationsService) {}

  @Get()
  async list(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(adminRentalLocationsListQuerySchema))
    query: AdminRentalLocationsListQuery,
  ) {
    return this.rentalLocations.listAdmin(user.tenantId, query);
  }

  @Get(':id')
  async getOne(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(rentalLocationIdParamsSchema))
    params: RentalLocationIdParams,
  ) {
    return this.rentalLocations.getAdmin(user.tenantId, params.id);
  }

  @Post()
  async create(
    @CurrentUser() user: { tenantId: string },
    @Body(new ZodValidationPipe(createRentalLocationBodySchema))
    body: CreateRentalLocationBody,
  ) {
    return this.rentalLocations.create(user.tenantId, body);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(rentalLocationIdParamsSchema))
    params: RentalLocationIdParams,
    @Body(new ZodValidationPipe(updateRentalLocationBodySchema))
    body: UpdateRentalLocationBody,
  ) {
    return this.rentalLocations.update(user.tenantId, params.id, body);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(rentalLocationIdParamsSchema))
    params: RentalLocationIdParams,
  ) {
    return this.rentalLocations.remove(user.tenantId, params.id);
  }

  @Post(':id/products')
  async createProduct(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param(new ZodValidationPipe(rentalLocationIdParamsSchema))
    params: RentalLocationIdParams,
    @Body(new ZodValidationPipe(createRentalProductBodySchema))
    body: CreateRentalProductBody,
  ) {
    return this.rentalLocations.createProduct(
      user.tenantId,
      params.id,
      user.id,
      body,
    );
  }

  @Patch(':id/products/:productId')
  async updateProduct(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(rentalProductIdParamsSchema))
    params: RentalProductIdParams,
    @Body(new ZodValidationPipe(updateRentalProductBodySchema))
    body: UpdateRentalProductBody,
  ) {
    return this.rentalLocations.updateProduct(
      user.tenantId,
      params.id,
      params.productId,
      body,
    );
  }
}
