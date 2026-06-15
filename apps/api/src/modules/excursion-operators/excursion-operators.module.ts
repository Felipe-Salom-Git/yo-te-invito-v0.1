import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { SubcategoriesModule } from '../subcategories/subcategories.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ExcursionOperatorsService } from './excursion-operators.service';
import { AdminExcursionOperatorsController } from './admin-excursion-operators.controller';
import { PublicExcursionOperatorsController } from './public-excursion-operators.controller';

@Module({
  imports: [AuthModule, SubcategoriesModule, NotificationsModule],
  controllers: [AdminExcursionOperatorsController, PublicExcursionOperatorsController],
  providers: [ExcursionOperatorsService],
  exports: [ExcursionOperatorsService],
})
export class ExcursionOperatorsModule {}
