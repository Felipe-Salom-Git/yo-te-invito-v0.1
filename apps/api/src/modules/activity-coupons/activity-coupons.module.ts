import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ActivityCouponsService } from './activity-coupons.service';

@Module({
  imports: [AuthModule],
  providers: [ActivityCouponsService],
  exports: [ActivityCouponsService],
})
export class ActivityCouponsModule {}
