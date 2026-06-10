import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ScannerAccountsModule } from '../scanner-accounts/scanner-accounts.module';
import { TicketsController } from './tickets.controller';
import { TicketTransferService } from './ticket-transfer.service';
import { TicketListExportService } from './ticket-list-export.service';
import { TicketDateChangeEligibilityService } from './ticket-date-change-eligibility.service';
import { TicketDateChangeService } from './ticket-date-change.service';
import { TicketDateChangeNotificationsService } from './ticket-date-change-notifications.service';

@Module({
  imports: [AuthModule, AuditModule, NotificationsModule, ScannerAccountsModule],
  controllers: [TicketsController],
  providers: [
    TicketTransferService,
    TicketListExportService,
    TicketDateChangeEligibilityService,
    TicketDateChangeService,
    TicketDateChangeNotificationsService,
  ],
  exports: [
    TicketListExportService,
    TicketDateChangeEligibilityService,
    TicketDateChangeService,
  ],
})
export class TicketsModule {}
