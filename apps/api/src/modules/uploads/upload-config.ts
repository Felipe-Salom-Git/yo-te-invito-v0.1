/**
 * GCS upload configuration from environment (lazy — safe if unset at boot).
 */

export type UploadConfig = {
  projectId: string | undefined;
  privateBucket: string | undefined;
  publicBucket: string | undefined;
  serviceAccountKeyFile: string | undefined;
  publicBaseUrl: string | undefined;
  signedUrlTtlSeconds: number;
  maxImageBytes: number;
  allowedMimeTypes: Set<string>;
};

const DEFAULT_MAX_MB = 5;
const DEFAULT_ALLOWED = 'image/jpeg,image/png,image/webp';

export function readUploadConfig(): UploadConfig {
  const maxMb = Number(process.env.UPLOAD_MAX_IMAGE_MB ?? DEFAULT_MAX_MB);
  const maxImageBytes =
    Number.isFinite(maxMb) && maxMb > 0 ? Math.floor(maxMb * 1024 * 1024) : DEFAULT_MAX_MB * 1024 * 1024;

  const rawMime = process.env.UPLOAD_ALLOWED_IMAGE_MIME_TYPES ?? DEFAULT_ALLOWED;
  const allowedMimeTypes = new Set(
    rawMime
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );

  const ttlRaw = Number(process.env.GCS_SIGNED_URL_TTL_SECONDS ?? 900);
  const signedUrlTtlSeconds = Number.isFinite(ttlRaw) && ttlRaw > 0 ? ttlRaw : 900;

  const publicBaseUrl = process.env.GCS_PUBLIC_BASE_URL?.trim().replace(/\/$/, '') || undefined;

  return {
    projectId: process.env.GCS_PROJECT_ID?.trim() || undefined,
    privateBucket: process.env.GCS_PRIVATE_BUCKET?.trim() || undefined,
    publicBucket: process.env.GCS_PUBLIC_BUCKET?.trim() || undefined,
    serviceAccountKeyFile: process.env.GCS_SERVICE_ACCOUNT_KEY_FILE?.trim() || undefined,
    publicBaseUrl,
    signedUrlTtlSeconds,
    maxImageBytes,
    allowedMimeTypes,
  };
}

export function isPublicUploadConfigured(config: UploadConfig): boolean {
  return Boolean(config.publicBucket);
}

export function resolvePublicBaseUrl(config: UploadConfig): string {
  if (config.publicBaseUrl) {
    return config.publicBaseUrl;
  }
  if (!config.publicBucket) {
    throw new Error('GCS_PUBLIC_BUCKET is not configured');
  }
  return `https://storage.googleapis.com/${config.publicBucket}`;
}
