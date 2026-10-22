import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { AdminCourtesyCreditLedgerController } from './admin-courtesy-credit-ledger.controller';
import { CourtesyCreditLedgerService } from './courtesy-credit-ledger.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [AdminCourtesyCreditLedgerController],
  providers: [CourtesyCreditLedgerService],
  exports: [CourtesyCreditLedgerService],
})
export class CourtesyCreditLedgerModule {}
