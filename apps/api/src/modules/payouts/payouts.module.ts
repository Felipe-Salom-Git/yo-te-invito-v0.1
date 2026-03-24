import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { ProducerRolesGuard } from '../../common/guards/producer-roles.guard';
import {
  AdminPayoutsController,
  ProducerPayoutsController,
} from './payouts.controller';
import { PayoutsService } from './payouts.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminPayoutsController, ProducerPayoutsController],
  providers: [ProfilesAuthorizationService, ProducerRolesGuard, PayoutsService],
})
export class PayoutsModule {}
