import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AdminBenefitSettlementsController } from './admin-benefit-settlements.controller';
import { BenefitSettlementEligibilityService } from './benefit-settlement-eligibility.service';
import { BenefitSettlementsService } from './benefit-settlements.service';

@Module({
  imports: [AuditModule],
  controllers: [AdminBenefitSettlementsController],
  providers: [BenefitSettlementEligibilityService, BenefitSettlementsService],
  exports: [BenefitSettlementsService, BenefitSettlementEligibilityService],
})
export class BenefitSettlementsModule {}
