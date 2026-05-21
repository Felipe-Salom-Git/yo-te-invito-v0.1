import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { GastroRolesGuard } from '../../common/guards/gastro-roles.guard';
import { SubcategoriesModule } from '../subcategories/subcategories.module';
import { ReviewDisputesModule } from '../review-disputes/review-disputes.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { GastroController } from './gastro.controller';
import { GastroReviewsController } from './gastro-reviews.controller';
import { GastroService } from './gastro.service';
import { GastroLocalService } from './gastro-local.service';
import { GastroPortalDiscountsService } from './gastro-portal-discounts.service';

@Module({
  imports: [AuthModule, SubcategoriesModule, ReviewDisputesModule, ReviewsModule],
  controllers: [GastroController, GastroReviewsController],
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
