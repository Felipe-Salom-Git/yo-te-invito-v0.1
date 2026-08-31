import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  Role,
  benefitReportingIntegrityQuerySchema,
  benefitReportingPeriodQuerySchema,
  benefitReportingPartnersQuerySchema,
  type BenefitReportingIntegrityQuery,
  type BenefitReportingPartnersQuery,
  type BenefitReportingPeriodQuery,
} from '@yo-te-invito/shared';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { BenefitSettlementReportingService } from './benefit-settlement-reporting.service';

@Controller('admin/benefit-reporting')
@UseGuards(JwtOrDevAuthGuard, RolesGuard)
@RequireRole(Role.ADMIN)
export class AdminBenefitReportingController {
  constructor(private readonly reporting: BenefitSettlementReportingService) {}

  @Get('monthly')
  monthly(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(benefitReportingPeriodQuerySchema))
    query: BenefitReportingPeriodQuery,
  ) {
    return this.reporting.getMonthly(user.tenantId, query);
  }

  @Get('partners')
  partners(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(benefitReportingPartnersQuerySchema))
    query: BenefitReportingPartnersQuery,
  ) {
    return this.reporting.getPartners(user.tenantId, query);
  }

  @Get('integrity')
  integrity(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(benefitReportingIntegrityQuerySchema))
    query: BenefitReportingIntegrityQuery,
  ) {
    return this.reporting.getIntegrity(user.tenantId, query);
  }
}
