import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { MarketingPreferencesService } from './marketing-preferences.service';
import { MeMarketingPreferencesController } from './me-marketing-preferences.controller';
import { PublicMarketingController } from '../../public/public-marketing.controller';

@Module({
  imports: [AuthModule],
  controllers: [MeMarketingPreferencesController, PublicMarketingController],
  providers: [MarketingPreferencesService],
  exports: [MarketingPreferencesService],
})
export class MarketingPreferencesModule {}
