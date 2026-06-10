import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { ScannerAccountsModule } from '../scanner-accounts/scanner-accounts.module';
import { TicketsController } from './tickets.controller';
import { TicketTransferService } from './ticket-transfer.service';
import { TicketListExportService } from './ticket-list-export.service';

@Module({
  imports: [AuthModule, AuditModule, ScannerAccountsModule],
  controllers: [TicketsController],
  providers: [TicketTransferService, TicketListExportService],
  exports: [TicketListExportService],
})
export class TicketsModule {}
