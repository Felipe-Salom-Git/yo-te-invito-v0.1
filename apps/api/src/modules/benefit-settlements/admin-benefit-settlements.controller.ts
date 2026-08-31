import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  Role,
  allocateBenefitSettlementUsagesBodySchema,
  benefitSettlementsListQuerySchema,
  generateBenefitSettlementBodySchema,
  type AllocateBenefitSettlementUsagesBody,
  type BenefitSettlementsListQuery,
  type GenerateBenefitSettlementBody,
} from '@yo-te-invito/shared';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { BenefitSettlementsService } from './benefit-settlements.service';

@Controller('admin/benefit-settlements')
@UseGuards(JwtOrDevAuthGuard, RolesGuard)
@RequireRole(Role.ADMIN)
export class AdminBenefitSettlementsController {
  constructor(private readonly settlements: BenefitSettlementsService) {}

  @Get()
  list(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(benefitSettlementsListQuerySchema)) query: BenefitSettlementsListQuery,
  ) {
    return this.settlements.list(user.tenantId, query);
  }

  @Post('generate')
  generate(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Body(new ZodValidationPipe(generateBenefitSettlementBodySchema)) body: GenerateBenefitSettlementBody,
  ) {
    return this.settlements.generate(user.tenantId, user, body);
  }

  @Get(':id')
  get(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.settlements.get(user.tenantId, id);
  }

  @Post(':id/refresh')
  refresh(@CurrentUser() user: { id: string; tenantId: string; role: string }, @Param('id') id: string) {
    return this.settlements.refresh(user.tenantId, user, id);
  }

  @Post(':id/allocate')
  allocate(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(allocateBenefitSettlementUsagesBodySchema))
    body: AllocateBenefitSettlementUsagesBody,
  ) {
    return this.settlements.allocate(user.tenantId, user, id, body);
  }

  @Post(':id/close')
  close(@CurrentUser() user: { id: string; tenantId: string; role: string }, @Param('id') id: string) {
    return this.settlements.close(user.tenantId, user, id);
  }
}
