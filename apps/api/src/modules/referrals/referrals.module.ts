import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { ProducerRolesGuard } from '../../common/guards/producer-roles.guard';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';

@Module({
  imports: [AuthModule],
  controllers: [ReferralsController],
  providers: [ProfilesAuthorizationService, ProducerRolesGuard, ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
