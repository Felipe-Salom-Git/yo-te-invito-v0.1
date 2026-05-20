import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { GastroRolesGuard } from '../../common/guards/gastro-roles.guard';
import { SubcategoriesModule } from '../subcategories/subcategories.module';
import { GastroController } from './gastro.controller';
import { GastroService } from './gastro.service';
import { GastroLocalService } from './gastro-local.service';
import { GastroPortalDiscountsService } from './gastro-portal-discounts.service';

@Module({
  imports: [AuthModule, SubcategoriesModule],
  controllers: [GastroController],
  providers: [
    ProfilesAuthorizationService,
    GastroRolesGuard,
    GastroService,
    GastroLocalService,
    GastroPortalDiscountsService,
  ],
  exports: [GastroPortalDiscountsService],
})
export class GastroModule {}
