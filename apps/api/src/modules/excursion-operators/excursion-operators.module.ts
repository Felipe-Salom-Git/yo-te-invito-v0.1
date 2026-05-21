import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { SubcategoriesModule } from '../subcategories/subcategories.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ExcursionOperatorsService } from './excursion-operators.service';
import { AdminExcursionOperatorsController } from './admin-excursion-operators.controller';

@Module({
  imports: [AuthModule, SubcategoriesModule, NotificationsModule],
  controllers: [AdminExcursionOperatorsController],
  providers: [ExcursionOperatorsService],
  exports: [ExcursionOperatorsService],
})
export class ExcursionOperatorsModule {}
