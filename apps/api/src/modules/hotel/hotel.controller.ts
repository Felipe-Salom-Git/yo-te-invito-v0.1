import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { HotelRolesGuard } from '../../common/guards/hotel-roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@yo-te-invito/shared';
import { HotelService } from './hotel.service';

@Controller('hotel')
@UseGuards(JwtOrDevAuthGuard, HotelRolesGuard)
@RequireRole(Role.ADMIN, Role.HOTEL_OWNER)
export class HotelController {
  constructor(private readonly hotel: HotelService) {}

  @Get('me')
  async getMyHotel(
    @CurrentUser() user: { id: string; tenantId: string },
  ) {
    return this.hotel.getMyProfile(user.tenantId, user.id);
  }
}
