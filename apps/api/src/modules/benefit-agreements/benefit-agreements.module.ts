import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { AdminBenefitAgreementsController } from './admin-benefit-agreements.controller';
import { BenefitCommercialAgreementsService } from './benefit-commercial-agreements.service';
import { BenefitDiscountAgreementHistoryService } from './benefit-discount-agreement-history.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [AdminBenefitAgreementsController],
  providers: [BenefitCommercialAgreementsService, BenefitDiscountAgreementHistoryService],
  exports: [BenefitCommercialAgreementsService, BenefitDiscountAgreementHistoryService],
})
export class BenefitAgreementsModule {}
