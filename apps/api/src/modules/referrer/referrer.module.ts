import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { CommercialReviewsModule } from '../commercial-reviews/commercial-reviews.module';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { ReferrerRolesGuard } from '../../common/guards/referrer-roles.guard';
import { ReferrerProfilesService } from './referrer-profiles.service';
import { ReferrerIdentityService } from './referrer-identity.service';
import { ReferrerSelfController } from './referrer-self.controller';
import { ReferrerProposalsController } from './referrer-proposals.controller';
import { ReferrerPaymentRequestsController } from './referrer-payment-requests.controller';
import { ReferrerMetricsController } from './referrer-metrics.controller';

@Module({
  imports: [
    PrismaModule,
    ReferralsModule,
    CommercialReviewsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [
    ReferrerSelfController,
    ReferrerProposalsController,
    ReferrerPaymentRequestsController,
    ReferrerMetricsController,
  ],
  providers: [
    ReferrerProfilesService,
    ReferrerIdentityService,
    ProfilesAuthorizationService,
    ReferrerRolesGuard,
    JwtOrDevAuthGuard,
  ],
  exports: [ReferrerProfilesService, ReferrerIdentityService],
})
export class ReferrerModule {}
