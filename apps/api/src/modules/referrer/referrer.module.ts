import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { ReferrerRolesGuard } from '../../common/guards/referrer-roles.guard';
import { ReferrerProfilesService } from './referrer-profiles.service';
import { ReferrerIdentityService } from './referrer-identity.service';
import { ReferrerSelfController } from './referrer-self.controller';

@Module({
  imports: [PrismaModule, AuthModule, ReferralsModule],
  controllers: [ReferrerSelfController],
  providers: [
    ReferrerProfilesService,
    ReferrerIdentityService,
    ProfilesAuthorizationService,
    ReferrerRolesGuard,
  ],
  exports: [ReferrerProfilesService, ReferrerIdentityService],
})
export class ReferrerModule {}
