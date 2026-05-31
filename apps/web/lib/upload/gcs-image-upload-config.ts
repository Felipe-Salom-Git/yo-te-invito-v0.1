import type { UploadScope } from '@yo-te-invito/shared';

/** Admin scopes supported by shared image upload helpers. */
export type GcsImageUploadScope = Extract<UploadScope, 'rental' | 'event' | 'excursion'>;

export type GcsImageUploadConfig = {
  scope: GcsImageUploadScope;
  entityId: string;
};

export const GCS_UPLOAD_ERROR =
  'No pudimos subir la imagen. Revisá el formato/peso e intentá nuevamente.';

export const IMAGE_ACCEPT_GCS = 'image/jpeg,image/png,image/webp';
