import { Module } from '@nestjs/common';
import { TicketBatchService } from './ticket-batch.service';

@Module({
  providers: [TicketBatchService],
  exports: [TicketBatchService],
})
export class TicketingModule {}
