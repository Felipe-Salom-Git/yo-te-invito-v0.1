import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  producerProfileApplySchema,
  gastroProfileApplySchema,
  hotelProfileApplySchema,
  referrerProfileApplySchema,
  type ProducerProfileApplyInput,
  type GastroProfileApplyInput,
  type HotelProfileApplyInput,
  type ReferrerProfileApplyInput,
} from '@yo-te-invito/shared';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
@UseGuards(JwtOrDevAuthGuard)
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Post('producer/apply')
  async applyProducer(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(producerProfileApplySchema)) body: ProducerProfileApplyInput,
  ) {
    return this.profiles.applyProducer(user.tenantId, user.id, body);
  }

  @Post('gastro/apply')
  async applyGastro(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(gastroProfileApplySchema)) body: GastroProfileApplyInput,
  ) {
    return this.profiles.applyGastro(user.tenantId, user.id, body);
  }

  @Post('hotel/apply')
  async applyHotel(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(hotelProfileApplySchema)) body: HotelProfileApplyInput,
  ) {
    return this.profiles.applyHotel(user.tenantId, user.id, body);
  }

  @Post('referrer/apply')
  async applyReferrer(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(referrerProfileApplySchema)) body: ReferrerProfileApplyInput,
  ) {
    return this.profiles.applyReferrer(user.tenantId, user.id, body);
  }
}
