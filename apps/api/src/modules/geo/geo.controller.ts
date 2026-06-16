import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { resolveAddressBodySchema, type ResolveAddressBody } from '@yo-te-invito/shared';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { GeoService } from './geo.service';

@Controller('geo')
@UseGuards(JwtOrDevAuthGuard)
export class GeoController {
  constructor(private readonly geo: GeoService) {}

  @Post('resolve-address')
  resolveAddress(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Body(new ZodValidationPipe(resolveAddressBodySchema)) body: ResolveAddressBody,
  ) {
    return this.geo.resolveAddress(user.tenantId, user.id, user.role, body);
  }
}
