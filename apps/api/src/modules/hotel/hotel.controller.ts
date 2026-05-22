import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  hotelProfileUpdateSchema,
  Role,
  type HotelProfileUpdateInput,
} from '@yo-te-invito/shared';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { HotelRolesGuard } from '../../common/guards/hotel-roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { HotelService } from './hotel.service';

@Controller('hotel')
@UseGuards(JwtOrDevAuthGuard, HotelRolesGuard)
@RequireRole(Role.ADMIN, Role.HOTEL_OWNER)
export class HotelController {
  constructor(private readonly hotel: HotelService) {}

  @Get('me')
  async getMyHotel(@CurrentUser() user: { id: string; tenantId: string; role: string }) {
    return this.hotel.getMyProfile(user.tenantId, user.id, user.role);
  }

  @Patch('me')
  async patchMyHotel(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Body(new ZodValidationPipe(hotelProfileUpdateSchema)) body: HotelProfileUpdateInput,
  ) {
    return this.hotel.updateMyProfile(user.tenantId, user.id, user.role, body);
  }
}
