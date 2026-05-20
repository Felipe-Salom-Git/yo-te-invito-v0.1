import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ReferrerModule } from '../referrer/referrer.module';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

@Module({
  imports: [
    ReferrerModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [ProfilesController],
  providers: [ProfilesService, JwtOrDevAuthGuard],
  exports: [ProfilesService],
})
export class ProfilesModule {}
