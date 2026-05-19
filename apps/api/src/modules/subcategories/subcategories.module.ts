import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { SubcategoriesService } from './subcategories.service';
import { PublicSubcategoriesController } from './public-subcategories.controller';
import { AdminSubcategoriesController } from './admin-subcategories.controller';

@Module({
  imports: [AuthModule],
  controllers: [PublicSubcategoriesController, AdminSubcategoriesController],
  providers: [SubcategoriesService],
  exports: [SubcategoriesService],
})
export class SubcategoriesModule {}
