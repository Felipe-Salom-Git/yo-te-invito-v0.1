import { Injectable, Logger } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { readUploadConfig, type UploadConfig } from './upload-config';

@Injectable()
export class GcsStorageService {
  private readonly logger = new Logger(GcsStorageService.name);
  private client: Storage | null = null;

  getConfig(): UploadConfig {
    return readUploadConfig();
  }

  isPublicUploadReady(): boolean {
    const config = this.getConfig();
    return Boolean(config.publicBucket);
  }

  private getStorageClient(): Storage {
    if (this.client) {
      return this.client;
    }

    const config = this.getConfig();
    const options: ConstructorParameters<typeof Storage>[0] = {};

    if (config.projectId) {
      options.projectId = config.projectId;
    }

    if (config.serviceAccountKeyFile) {
      options.keyFilename = config.serviceAccountKeyFile;
    }

    this.client = new Storage(options);
    return this.client;
  }

  async uploadPublicObject(params: {
    objectKey: string;
    buffer: Buffer;
    contentType: string;
  }): Promise<{ bucket: string; objectKey: string }> {
    const config = this.getConfig();
    const bucketName = config.publicBucket;
    if (!bucketName) {
      throw new Error('GCS_PUBLIC_BUCKET is not configured');
    }

    const bucket = this.getStorageClient().bucket(bucketName);
    const file = bucket.file(params.objectKey);

    await file.save(params.buffer, {
      resumable: false,
      metadata: {
        contentType: params.contentType,
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });

    this.logger.log(`Uploaded public object gs://${bucketName}/${params.objectKey}`);

    return { bucket: bucketName, objectKey: params.objectKey };
  }
}
