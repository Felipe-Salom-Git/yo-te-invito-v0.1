import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActivityCouponsService } from './activity-coupons.service';
import { ActivityCouponExpiryService } from './activity-coupon-expiry.service';
import { ActivityCouponClaimEmailService } from './activity-coupon-claim-email.service';
import { AdminActivityCouponsController } from './admin-activity-coupons.controller';
import { PublicActivityCouponsController } from './public-activity-coupons.controller';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [AdminActivityCouponsController, PublicActivityCouponsController],
  providers: [
    ActivityCouponsService,
    ActivityCouponExpiryService,
    ActivityCouponClaimEmailService,
  ],
  exports: [ActivityCouponsService],
})
export class ActivityCouponsModule {}
