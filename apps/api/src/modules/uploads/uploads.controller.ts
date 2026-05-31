import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { readUploadConfig } from './upload-config';
import { UploadsService } from './uploads.service';
import type { UploadAuthUser } from './uploads-authorization.service';

/**
 * Public image uploads to GCS.
 *
 * Auth: JWT (or dev header). ADMIN bypasses ownership checks.
 * Portal roles: producer / gastro / hotel with entity ownership — see UploadsAuthorizationService.
 */
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('public-image')
  @UseGuards(JwtOrDevAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: readUploadConfig().maxImageBytes,
      },
    }),
  )
  uploadPublicImage(
    @CurrentUser() user: UploadAuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: Record<string, string>,
  ) {
    return this.uploadsService.uploadPublicImage(user, file, body);
  }
}
