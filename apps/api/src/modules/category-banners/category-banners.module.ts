import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { CategoryBannersService } from './category-banners.service';
import { CategoryEditorialBannersService } from './category-editorial-banners.service';
import { AdminCategoryBannersController } from './admin-category-banners.controller';
import { AdminCategoryEditorialBannersController } from './admin-category-editorial-banners.controller';
import { PublicCategoryBannersController } from './public-category-banners.controller';
import { PublicCategoryEditorialBannersController } from './public-category-editorial-banners.controller';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [
    AdminCategoryBannersController,
    AdminCategoryEditorialBannersController,
    PublicCategoryBannersController,
    PublicCategoryEditorialBannersController,
  ],
  providers: [CategoryBannersService, CategoryEditorialBannersService],
  exports: [CategoryBannersService, CategoryEditorialBannersService],
})
export class CategoryBannersModule {}
