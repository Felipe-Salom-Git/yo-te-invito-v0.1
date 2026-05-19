import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { HotelRolesGuard } from '../../common/guards/hotel-roles.guard';
import { HotelController } from './hotel.controller';
import { HotelService } from './hotel.service';

@Module({
  imports: [AuthModule],
  controllers: [HotelController],
  providers: [HotelService, ProfilesAuthorizationService, HotelRolesGuard],
})
export class HotelModule {}
