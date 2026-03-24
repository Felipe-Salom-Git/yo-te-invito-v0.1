import { Module } from '@nestjs/common';
import { GetnetAuthService } from './getnet-auth.service';
import { GetnetCheckoutService } from './getnet-checkout.service';

@Module({
  providers: [GetnetAuthService, GetnetCheckoutService],
  exports: [GetnetAuthService, GetnetCheckoutService],
})
export class GetnetModule {}
