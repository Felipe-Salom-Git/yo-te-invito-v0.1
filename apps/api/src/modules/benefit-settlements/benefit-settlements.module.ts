import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { CourtesyCreditLedgerModule } from '../courtesy-credit-ledger/courtesy-credit-ledger.module';
import { AdminBenefitSettlementsController } from './admin-benefit-settlements.controller';
import { AdminBenefitReportingController } from './admin-benefit-reporting.controller';
import { BenefitSettlementEligibilityService } from './benefit-settlement-eligibility.service';
import { BenefitSettlementIntegrityService } from './benefit-settlement-integrity.service';
import { BenefitSettlementPendingValidationsService } from './benefit-settlement-pending-validations.service';
import { BenefitSettlementReportingService } from './benefit-settlement-reporting.service';
import { BenefitSettlementTransfersService } from './benefit-settlement-transfers.service';
import { BenefitSettlementsService } from './benefit-settlements.service';
import { GastroDiscountEconomicReportingService } from './gastro-discount-economic-reporting.service';

@Module({
  imports: [AuthModule, AuditModule, CourtesyCreditLedgerModule],
  controllers: [AdminBenefitSettlementsController, AdminBenefitReportingController],
  providers: [
    BenefitSettlementEligibilityService,
    BenefitSettlementsService,
    BenefitSettlementTransfersService,
    BenefitSettlementIntegrityService,
    BenefitSettlementReportingService,
    BenefitSettlementPendingValidationsService,
    GastroDiscountEconomicReportingService,
  ],
  exports: [
    BenefitSettlementsService,
    BenefitSettlementEligibilityService,
    BenefitSettlementTransfersService,
    BenefitSettlementIntegrityService,
    BenefitSettlementReportingService,
    GastroDiscountEconomicReportingService,
  ],
})
export class BenefitSettlementsModule {}
