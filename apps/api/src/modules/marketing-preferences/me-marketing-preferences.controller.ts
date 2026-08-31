import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  patchMeMarketingPreferencesBodySchema,
  type PatchMeMarketingPreferencesBody,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MarketingPreferencesService } from './marketing-preferences.service';

@Controller('me')
@UseGuards(JwtOrDevAuthGuard)
export class MeMarketingPreferencesController {
  constructor(private readonly marketing: MarketingPreferencesService) {}

  @Get('marketing-preferences')
  getMine(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.marketing.getMine(user.tenantId, user.id);
  }

  @Patch('marketing-preferences')
  patchMine(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(patchMeMarketingPreferencesBodySchema))
    body: PatchMeMarketingPreferencesBody,
  ) {
    return this.marketing.patchMine(user.tenantId, user.id, body);
  }
}
