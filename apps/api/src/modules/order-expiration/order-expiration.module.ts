import { Module } from '@nestjs/common';
import { OrderExpirationController } from './order-expiration.controller';
import { OrderExpirationService } from './order-expiration.service';
import { TicketingModule } from '../../ticketing/ticketing.module';

@Module({
  imports: [TicketingModule],
  controllers: [OrderExpirationController],
  providers: [OrderExpirationService],
  exports: [OrderExpirationService],
})
export class OrderExpirationModule {}
