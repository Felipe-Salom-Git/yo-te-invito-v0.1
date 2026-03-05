import { Module } from '@nestjs/common';
import { PublicOrderPaymentsController } from './public-order-payments.controller';
import { PublicPaymentsDemoController } from './public-payments-demo.controller';
import { PublicPaymentsService } from './public-payments.service';

@Module({
  controllers: [
    PublicOrderPaymentsController,
    PublicPaymentsDemoController,
  ],
  providers: [PublicPaymentsService],
})
export class PublicPaymentsModule {}
