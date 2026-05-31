import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { RolesGuard } from '../../common/guards/roles.guard';
import { GcsStorageService } from './gcs-storage.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [AuthModule],
  controllers: [UploadsController],
  providers: [UploadsService, GcsStorageService, RolesGuard],
  exports: [UploadsService, GcsStorageService],
})
export class UploadsModule {}
