import { Module } from '@nestjs/common';
import { GetnetAuthService } from './getnet-auth.service';
import { GetnetCheckoutService } from './getnet-checkout.service';
import { GetnetWebCheckoutAuthService } from './webcheckout/getnet-webcheckout-auth.service';
import { GetnetWebCheckoutClientService } from './webcheckout/getnet-webcheckout-client.service';

@Module({
  providers: [
    GetnetAuthService,
    GetnetCheckoutService,
    GetnetWebCheckoutAuthService,
    GetnetWebCheckoutClientService,
  ],
  exports: [
    GetnetAuthService,
    GetnetCheckoutService,
    GetnetWebCheckoutAuthService,
    GetnetWebCheckoutClientService,
  ],
})
export class GetnetModule {}
