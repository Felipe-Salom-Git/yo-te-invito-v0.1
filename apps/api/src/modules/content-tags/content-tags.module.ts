import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ContentTagsService } from './content-tags.service';
import { AdminContentTagsController } from './admin-content-tags.controller';
import { PublicContentTagsController } from './public-content-tags.controller';

@Module({
  imports: [AuthModule],
  controllers: [AdminContentTagsController, PublicContentTagsController],
  providers: [ContentTagsService],
  exports: [ContentTagsService],
})
export class ContentTagsModule {}
