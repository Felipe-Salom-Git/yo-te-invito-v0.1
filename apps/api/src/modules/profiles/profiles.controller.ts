import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  profileProducerApplySchema,
  profileGastroApplySchema,
  profileHotelApplySchema,
  profileReferrerApplySchema,
  type ProfileProducerApplyInput,
  type ProfileGastroApplyInput,
  type ProfileHotelApplyInput,
  type ProfileReferrerApplyInput,
} from '@yo-te-invito/shared';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
@UseGuards(JwtOrDevAuthGuard)
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Post('producer/apply')
  async applyProducer(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(profileProducerApplySchema)) body: ProfileProducerApplyInput,
  ) {
    return this.profiles.applyProducer(user.tenantId, user.id, body);
  }

  @Post('gastro/apply')
  async applyGastro(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(profileGastroApplySchema)) body: ProfileGastroApplyInput,
  ) {
    return this.profiles.applyGastro(user.tenantId, user.id, body);
  }

  @Post('hotel/apply')
  async applyHotel(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(profileHotelApplySchema)) body: ProfileHotelApplyInput,
  ) {
    return this.profiles.applyHotel(user.tenantId, user.id, body);
  }

  @Post('referrer/apply')
  async applyReferrer(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(profileReferrerApplySchema)) body: ProfileReferrerApplyInput,
  ) {
    return this.profiles.applyReferrer(user.tenantId, user.id, body);
  }
}
