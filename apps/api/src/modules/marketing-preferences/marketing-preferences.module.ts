import { Module } from '@nestjs/common';
import { MarketingPreferencesService } from './marketing-preferences.service';
import { MeMarketingPreferencesController } from './me-marketing-preferences.controller';
import { PublicMarketingController } from '../../public/public-marketing.controller';

@Module({
  controllers: [MeMarketingPreferencesController, PublicMarketingController],
  providers: [MarketingPreferencesService],
  exports: [MarketingPreferencesService],
})
export class MarketingPreferencesModule {}
