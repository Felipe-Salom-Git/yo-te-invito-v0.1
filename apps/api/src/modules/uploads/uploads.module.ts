import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { GcsStorageService } from './gcs-storage.service';
import { UploadsAuthorizationService } from './uploads-authorization.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [AuthModule],
  controllers: [UploadsController],
  providers: [
    UploadsService,
    GcsStorageService,
    UploadsAuthorizationService,
    ProfilesAuthorizationService,
  ],
  exports: [UploadsService, GcsStorageService],
})
export class UploadsModule {}
