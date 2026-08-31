import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  Role,
  benefitCommercialAgreementPartnerHistoryQuerySchema,
  benefitCommercialAgreementsListQuerySchema,
  closeBenefitCommercialAgreementBodySchema,
  createBenefitCommercialAgreementBodySchema,
  replaceBenefitCommercialAgreementBodySchema,
  updateBenefitCommercialAgreementNotesBodySchema,
  type BenefitCommercialAgreementPartnerHistoryQuery,
  type BenefitCommercialAgreementsListQuery,
  type CloseBenefitCommercialAgreementBody,
  type CreateBenefitCommercialAgreementBody,
  type ReplaceBenefitCommercialAgreementBody,
  type UpdateBenefitCommercialAgreementNotesBody,
} from '@yo-te-invito/shared';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { BenefitCommercialAgreementsService } from './benefit-commercial-agreements.service';

@Controller('admin/benefit-agreements')
@UseGuards(JwtOrDevAuthGuard, RolesGuard)
@RequireRole(Role.ADMIN)
export class AdminBenefitAgreementsController {
  constructor(private readonly agreements: BenefitCommercialAgreementsService) {}

  @Get()
  list(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(benefitCommercialAgreementsListQuerySchema))
    query: BenefitCommercialAgreementsListQuery,
  ) {
    return this.agreements.list(user.tenantId, query);
  }

  @Get('partner-history')
  partnerHistory(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(benefitCommercialAgreementPartnerHistoryQuerySchema))
    query: BenefitCommercialAgreementPartnerHistoryQuery,
  ) {
    return this.agreements.partnerHistory(user.tenantId, query);
  }

  @Get(':id')
  get(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.agreements.get(user.tenantId, id);
  }

  @Post()
  create(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Body(new ZodValidationPipe(createBenefitCommercialAgreementBodySchema))
    body: CreateBenefitCommercialAgreementBody,
  ) {
    return this.agreements.create(user.tenantId, user, body);
  }

  @Post(':id/close')
  close(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(closeBenefitCommercialAgreementBodySchema))
    body: CloseBenefitCommercialAgreementBody,
  ) {
    return this.agreements.close(user.tenantId, user, id, body);
  }

  @Post(':id/replace')
  replace(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(replaceBenefitCommercialAgreementBodySchema))
    body: ReplaceBenefitCommercialAgreementBody,
  ) {
    return this.agreements.replace(user.tenantId, user, id, body);
  }

  @Patch(':id')
  updateNotes(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateBenefitCommercialAgreementNotesBodySchema))
    body: UpdateBenefitCommercialAgreementNotesBody,
  ) {
    return this.agreements.updateNotes(user.tenantId, user, id, body);
  }
}
