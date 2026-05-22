import { Module } from '@nestjs/common';
import { PublicOrderPaymentsController } from './public-order-payments.controller';
import { PublicPaymentsDemoController } from './public-payments-demo.controller';
import { PublicPaymentsRefreshController } from './public-payments-refresh.controller';
import { PublicPaymentsService } from './public-payments.service';
import { GetnetAuthService } from './providers/getnet/getnet-auth.service';
import { GetnetCheckoutService } from './providers/getnet/getnet-checkout.service';
import { TicketingModule } from '../../ticketing/ticketing.module';
import { ReferralsModule } from '../referrals/referrals.module';

@Module({
  imports: [TicketingModule, ReferralsModule],
  controllers: [
    PublicOrderPaymentsController,
    PublicPaymentsDemoController,
    PublicPaymentsRefreshController,
  ],
  providers: [PublicPaymentsService, GetnetAuthService, GetnetCheckoutService],
})
export class PublicPaymentsModule {}
