import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { SubcategoriesModule } from '../subcategories/subcategories.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RentalLocationsService } from './rental-locations.service';
import { AdminRentalLocationsController } from './admin-rental-locations.controller';
import { PublicRentalLocationsController } from './public-rental-locations.controller';

@Module({
  imports: [AuthModule, SubcategoriesModule, NotificationsModule],
  controllers: [AdminRentalLocationsController, PublicRentalLocationsController],
  providers: [RentalLocationsService],
  exports: [RentalLocationsService],
})
export class RentalLocationsModule {}
