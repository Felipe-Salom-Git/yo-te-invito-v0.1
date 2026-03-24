import { Module } from '@nestjs/common';
import { PublicOrderPaymentsController } from './public-order-payments.controller';
import { PublicPaymentsDemoController } from './public-payments-demo.controller';
import { PublicPaymentsRefreshController } from './public-payments-refresh.controller';
import { PublicPaymentsService } from './public-payments.service';
import { GetnetModule } from './providers/getnet/getnet.module';

@Module({
  imports: [GetnetModule],
  controllers: [
    PublicOrderPaymentsController,
    PublicPaymentsDemoController,
    PublicPaymentsRefreshController,
  ],
  providers: [PublicPaymentsService],
})
export class PublicPaymentsModule {}
