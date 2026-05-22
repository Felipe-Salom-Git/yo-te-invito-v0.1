import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { ProducerRolesGuard } from '../../common/guards/producer-roles.guard';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';
import { ReferralProposalsService } from './referral-proposals.service';
import { ReferralCommissionService } from './referral-commission.service';
import { ReferralPaymentRequestsService } from './referral-payment-requests.service';
import { ReferralMetricsService } from './referral-metrics.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [ReferralsController],
  providers: [
    ProfilesAuthorizationService,
    ProducerRolesGuard,
    ReferralsService,
    ReferralProposalsService,
    ReferralCommissionService,
    ReferralPaymentRequestsService,
    ReferralMetricsService,
    JwtOrDevAuthGuard,
  ],
  exports: [
    ReferralsService,
    ReferralProposalsService,
    ReferralCommissionService,
    ReferralPaymentRequestsService,
    ReferralMetricsService,
  ],
})
export class ReferralsModule {}
