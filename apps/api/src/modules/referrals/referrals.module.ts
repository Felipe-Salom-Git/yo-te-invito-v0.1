import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { ProducerRolesGuard } from '../../common/guards/producer-roles.guard';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';

@Module({
  imports: [
    PrismaModule,
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
    JwtOrDevAuthGuard,
  ],
  exports: [ReferralsService],
})
export class ReferralsModule {}
