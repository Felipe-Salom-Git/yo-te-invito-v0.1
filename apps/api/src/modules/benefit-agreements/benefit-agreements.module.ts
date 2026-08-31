import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AdminBenefitAgreementsController } from './admin-benefit-agreements.controller';
import { BenefitCommercialAgreementsService } from './benefit-commercial-agreements.service';

@Module({
  imports: [AuditModule],
  controllers: [AdminBenefitAgreementsController],
  providers: [BenefitCommercialAgreementsService],
  exports: [BenefitCommercialAgreementsService],
})
export class BenefitAgreementsModule {}
