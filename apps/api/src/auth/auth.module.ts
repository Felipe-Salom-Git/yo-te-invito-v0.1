import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { ReferrerModule } from '../modules/referrer/referrer.module';
import { LegalModule } from '../modules/legal/legal.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ProfileRegistrationService } from './profile-registration.service';
import { JwtOrDevAuthGuard } from './jwt-or-dev-auth.guard';
import { OptionalJwtOrDevAuthGuard } from './optional-jwt-or-dev-auth.guard';

@Module({
  imports: [
    PrismaModule,
    ReferrerModule,
    forwardRef(() => LegalModule),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    ProfileRegistrationService,
    JwtOrDevAuthGuard,
    OptionalJwtOrDevAuthGuard,
  ],
  exports: [
    AuthService,
    ProfileRegistrationService,
    JwtOrDevAuthGuard,
    OptionalJwtOrDevAuthGuard,
    JwtModule,
    PrismaModule,
  ],
})
export class AuthModule {}
