import { Controller, Get, Post, Query } from '@nestjs/common';
import {
  publicMarketingUnsubscribeQuerySchema,
  type PublicMarketingUnsubscribeQuery,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { MarketingPreferencesService } from '../modules/marketing-preferences/marketing-preferences.service';

@Controller('public/marketing')
export class PublicMarketingController {
  constructor(private readonly marketing: MarketingPreferencesService) {}

  @Get('unsubscribe')
  unsubscribeGet(
    @Query(new ZodValidationPipe(publicMarketingUnsubscribeQuerySchema))
    query: PublicMarketingUnsubscribeQuery,
  ) {
    return this.marketing.unsubscribeByToken(query.token);
  }

  @Post('unsubscribe')
  unsubscribePost(
    @Query(new ZodValidationPipe(publicMarketingUnsubscribeQuerySchema))
    query: PublicMarketingUnsubscribeQuery,
  ) {
    return this.marketing.unsubscribeByToken(query.token);
  }
}
