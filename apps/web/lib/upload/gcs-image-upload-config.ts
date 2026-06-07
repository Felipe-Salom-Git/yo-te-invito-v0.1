import type { UploadScope } from '@yo-te-invito/shared';

/** Portal + admin scopes supported by shared image upload helpers. */
export type GcsImageUploadScope = Extract<
  UploadScope,
  'rental' | 'event' | 'excursion' | 'producer' | 'gastro' | 'hotel' | 'platform'
>;

export type GcsImageUploadConfig =
  | {
      scope: Exclude<GcsImageUploadScope, 'platform'>;
      entityId: string;
    }
  | {
      scope: 'platform';
      entityId?: undefined;
    };

export const GCS_UPLOAD_ERROR =
  'No pudimos subir la imagen. Revisá el formato/peso e intentá nuevamente.';

export const IMAGE_ACCEPT_GCS = 'image/jpeg,image/png,image/webp';
