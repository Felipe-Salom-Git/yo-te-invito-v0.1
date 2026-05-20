import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { CategoryBannersService } from './category-banners.service';
import { AdminCategoryBannersController } from './admin-category-banners.controller';
import { PublicCategoryBannersController } from './public-category-banners.controller';

@Module({
  imports: [AuthModule],
  controllers: [AdminCategoryBannersController, PublicCategoryBannersController],
  providers: [CategoryBannersService],
  exports: [CategoryBannersService],
})
export class CategoryBannersModule {}
