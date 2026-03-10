import { Module } from '@nestjs/common';
import { OrderExpirationController } from './order-expiration.controller';
import { OrderExpirationService } from './order-expiration.service';

@Module({
  controllers: [OrderExpirationController],
  providers: [OrderExpirationService],
  exports: [OrderExpirationService],
})
export class OrderExpirationModule {}
