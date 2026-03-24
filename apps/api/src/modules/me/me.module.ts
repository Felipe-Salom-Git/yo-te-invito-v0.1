import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { ReferrerRolesGuard } from '../../common/guards/referrer-roles.guard';
import { MeController } from './me.controller';
import { MeService } from './me.service';

@Module({
  imports: [AuthModule, ReferralsModule],
  controllers: [MeController],
  providers: [ProfilesAuthorizationService, ReferrerRolesGuard, MeService],
})
export class MeModule {}
