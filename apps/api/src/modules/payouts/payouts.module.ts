import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import {
  AdminPayoutsController,
  ProducerPayoutsController,
} from './payouts.controller';
import { PayoutsService } from './payouts.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminPayoutsController, ProducerPayoutsController],
  providers: [PayoutsService],
})
export class PayoutsModule {}
