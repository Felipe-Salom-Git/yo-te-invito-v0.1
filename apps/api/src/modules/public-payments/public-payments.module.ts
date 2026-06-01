import { Module } from '@nestjs/common';
import { PublicOrderPaymentsController } from './public-order-payments.controller';
import { PublicPaymentsDemoController } from './public-payments-demo.controller';
import { PublicPaymentsRefreshController } from './public-payments-refresh.controller';
import { PublicPaymentsGetnetWebhookController } from './public-payments-getnet-webhook.controller';
import { PublicPaymentsService } from './public-payments.service';
import { OrderFulfillmentService } from './order-fulfillment.service';
import { GetnetWebhookService } from './getnet-webhook.service';
import { GetnetReconciliationService } from './getnet-reconciliation.service';
import { CheckoutPaymentStatusService } from './checkout-payment-status.service';
import { GetnetAuthService } from './providers/getnet/getnet-auth.service';
import { GetnetCheckoutService } from './providers/getnet/getnet-checkout.service';
import { TicketingModule } from '../../ticketing/ticketing.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { EmailModule } from '../../email/email.module';

@Module({
  imports: [TicketingModule, ReferralsModule, EmailModule],
  controllers: [
    PublicPaymentsGetnetWebhookController,
    PublicOrderPaymentsController,
    PublicPaymentsDemoController,
    PublicPaymentsRefreshController,
  ],
  providers: [
    PublicPaymentsService,
    OrderFulfillmentService,
    GetnetWebhookService,
    GetnetReconciliationService,
    CheckoutPaymentStatusService,
    GetnetAuthService,
    GetnetCheckoutService,
  ],
  exports: [
    OrderFulfillmentService,
    GetnetWebhookService,
    GetnetReconciliationService,
  ],
})
export class PublicPaymentsModule {}
