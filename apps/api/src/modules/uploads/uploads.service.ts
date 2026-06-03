import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ErrorCode,
  publicImageUploadFieldsSchema,
  type PublicImageUploadFields,
  type PublicImageUploadResponse,
} from '@yo-te-invito/shared';
import { GcsStorageService } from './gcs-storage.service';
import {
  buildPublicObjectKey,
  buildPublicObjectUrl,
  extensionForMime,
} from './upload-paths';
import {
  detectImageMime,
  looksLikeDataUrl,
  BLOCKED_MIMES,
} from './upload-mime.util';
import { isPublicUploadConfigured, resolvePublicBaseUrl, readUploadConfig } from './upload-config';
import {
  UploadsAuthorizationService,
  type UploadAuthUser,
} from './uploads-authorization.service';
import { OperationalAlertsEmailService } from '../../email/operational-alerts-email.service';

type MulterFile = Express.Multer.File;

@Injectable()
export class UploadsService {
  constructor(
    private readonly gcs: GcsStorageService,
    private readonly uploadAuth: UploadsAuthorizationService,
    private readonly operationalAlerts: OperationalAlertsEmailService,
  ) {}

  async uploadPublicImage(
    user: UploadAuthUser,
    file: MulterFile | undefined,
    rawFields: Record<string, unknown>,
  ): Promise<PublicImageUploadResponse> {
    const config = readUploadConfig();

    if (!isPublicUploadConfigured(config)) {
      throw new ServiceUnavailableException({
        code: ErrorCode.INTERNAL_ERROR,
        message:
          'Public image upload is not configured (set GCS_PUBLIC_BUCKET and credentials)',
      });
    }

    const fields = this.parseFields(rawFields);
    await this.uploadAuth.assertCanUploadPublicImage(user, fields);
    const buffer = this.readFileBuffer(file, config.maxImageBytes);
    const contentType = this.validateImageBuffer(buffer, config);

    const ext = extensionForMime(contentType);
    const objectKey = buildPublicObjectKey({
      scope: fields.scope,
      entityId: fields.entityId,
      purpose: fields.purpose,
      ext,
    });

    let bucket: string;
    let storedKey: string;
    try {
      const uploaded = await this.gcs.uploadPublicObject({
        objectKey,
        buffer,
        contentType,
      });
      bucket = uploaded.bucket;
      storedKey = uploaded.objectKey;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.operationalAlerts.notifyStorageUploadFailed({
        entityType: fields.scope,
        entityId: fields.entityId,
        uploaderEmail: user.id,
        fileName: file?.originalname || objectKey,
        errorMessage: message,
        context: `purpose=${fields.purpose}\nobjectKey=${objectKey}`,
      });
      throw new ServiceUnavailableException({
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Image upload failed',
      });
    }

    const baseUrl = resolvePublicBaseUrl(config);
    const url = buildPublicObjectUrl(baseUrl, storedKey);

    return {
      url,
      objectKey: storedKey,
      bucket,
      contentType,
      size: buffer.length,
    };
  }

  private parseFields(raw: Record<string, unknown>): PublicImageUploadFields {
    const parsed = publicImageUploadFieldsSchema.safeParse({
      scope: typeof raw.scope === 'string' ? raw.scope : raw.scope,
      purpose: typeof raw.purpose === 'string' ? raw.purpose : raw.purpose,
      entityId:
        raw.entityId === undefined || raw.entityId === null || raw.entityId === ''
          ? undefined
          : String(raw.entityId),
    });

    if (!parsed.success) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Invalid upload fields',
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    return parsed.data;
  }

  private readFileBuffer(file: MulterFile | undefined, maxBytes: number): Buffer {
    if (!file) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'file is required',
      });
    }

    if (!file.buffer?.length) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'file is empty',
      });
    }

    if (file.size > maxBytes || file.buffer.length > maxBytes) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: `file exceeds maximum size of ${Math.floor(maxBytes / (1024 * 1024))} MB`,
      });
    }

    return file.buffer;
  }

  private validateImageBuffer(
    buffer: Buffer,
    config: ReturnType<typeof readUploadConfig>,
  ): string {
    if (looksLikeDataUrl(buffer)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'data URLs are not accepted; upload a binary image file',
      });
    }

    const detected = detectImageMime(buffer);
    if (!detected) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'file is not a supported image (JPEG, PNG, WEBP)',
      });
    }

    if (BLOCKED_MIMES.has(detected) || !config.allowedMimeTypes.has(detected)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: `MIME type not allowed: ${detected}`,
      });
    }

    return detected;
  }
}
