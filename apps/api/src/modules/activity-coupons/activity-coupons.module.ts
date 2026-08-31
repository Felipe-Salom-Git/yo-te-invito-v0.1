import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ActivityCouponsService } from './activity-coupons.service';
import { AdminActivityCouponsController } from './admin-activity-coupons.controller';
import { PublicActivityCouponsController } from './public-activity-coupons.controller';

@Module({
  imports: [AuthModule],
  controllers: [AdminActivityCouponsController, PublicActivityCouponsController],
  providers: [ActivityCouponsService],
  exports: [ActivityCouponsService],
})
export class ActivityCouponsModule {}
