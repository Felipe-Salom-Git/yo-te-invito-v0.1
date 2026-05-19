import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ReferrerModule } from '../referrer/referrer.module';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

@Module({
  imports: [AuthModule, ReferrerModule],
  controllers: [ProfilesController],
  providers: [ProfilesService],
})
export class ProfilesModule {}
