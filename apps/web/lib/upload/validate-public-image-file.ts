/** Mirrors API limits — see UPLOAD_MAX_IMAGE_MB / UPLOAD_ALLOWED_IMAGE_MIME_TYPES. */
export const PUBLIC_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const PUBLIC_IMAGE_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type PublicImageValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validatePublicImageFile(file: File): PublicImageValidationResult {
  if (
    !PUBLIC_IMAGE_ALLOWED_MIME_TYPES.includes(
      file.type as (typeof PUBLIC_IMAGE_ALLOWED_MIME_TYPES)[number],
    )
  ) {
    return {
      ok: false,
      message: 'Formato no permitido. Usá JPEG, PNG o WEBP (máx. 5 MB).',
    };
  }
  if (file.size > PUBLIC_IMAGE_MAX_BYTES) {
    return {
      ok: false,
      message: 'La imagen supera el máximo de 5 MB.',
    };
  }
  return { ok: true };
}

export function isDataImageUrl(url: string): boolean {
  return url.trim().toLowerCase().startsWith('data:image/');
}
