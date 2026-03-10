import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { TicketsController } from './tickets.controller';
import { TicketTransferService } from './ticket-transfer.service';

@Module({
  imports: [AuthModule],
  controllers: [TicketsController],
  providers: [TicketTransferService],
})
export class TicketsModule {}
