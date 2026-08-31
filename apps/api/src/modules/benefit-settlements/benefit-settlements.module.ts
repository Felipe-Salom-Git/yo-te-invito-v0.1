import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CourtesyCreditLedgerModule } from '../courtesy-credit-ledger/courtesy-credit-ledger.module';
import { AdminBenefitSettlementsController } from './admin-benefit-settlements.controller';
import { BenefitSettlementEligibilityService } from './benefit-settlement-eligibility.service';
import { BenefitSettlementTransfersService } from './benefit-settlement-transfers.service';
import { BenefitSettlementsService } from './benefit-settlements.service';

@Module({
  imports: [AuditModule, CourtesyCreditLedgerModule],
  controllers: [AdminBenefitSettlementsController],
  providers: [
    BenefitSettlementEligibilityService,
    BenefitSettlementsService,
    BenefitSettlementTransfersService,
  ],
  exports: [
    BenefitSettlementsService,
    BenefitSettlementEligibilityService,
    BenefitSettlementTransfersService,
  ],
})
export class BenefitSettlementsModule {}
