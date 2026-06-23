import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  geoLocalitiesQuerySchema,
  resolveAddressBodySchema,
  type GeoLocalitiesQuery,
  type ResolveAddressBody,
} from '@yo-te-invito/shared';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { GeoRefService } from './georef.service';
import { GeoService } from './geo.service';

@Controller('geo')
export class GeoController {
  constructor(
    private readonly geo: GeoService,
    private readonly georef: GeoRefService,
  ) {}

  @Get('provinces')
  listProvinces() {
    return this.georef.listProvinces().then((provinces) => ({ provinces }));
  }

  @Get('localities')
  listLocalities(
    @Query(new ZodValidationPipe(geoLocalitiesQuerySchema)) query: GeoLocalitiesQuery,
  ) {
    return this.georef.listLocalities(query.province).then((localities) => ({ localities }));
  }

  @Post('resolve-address')
  @UseGuards(JwtOrDevAuthGuard)
  resolveAddress(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Body(new ZodValidationPipe(resolveAddressBodySchema)) body: ResolveAddressBody,
  ) {
    return this.geo.resolveAddress(user.tenantId, user.id, user.role, body);
  }
}
