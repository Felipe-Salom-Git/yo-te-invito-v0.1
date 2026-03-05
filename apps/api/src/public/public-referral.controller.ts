import { Controller, Get, Param } from '@nestjs/common';
import { ReferralsService } from '../modules/referrals/referrals.service';

@Controller('public/referral')
export class PublicReferralController {
  constructor(private readonly referrals: ReferralsService) {}

  @Get(':code')
  async lookup(@Param('code') code: string) {
    const result = await this.referrals.lookupByCode(code);
    if (!result) return { eventId: null };
    return result;
  }
}
