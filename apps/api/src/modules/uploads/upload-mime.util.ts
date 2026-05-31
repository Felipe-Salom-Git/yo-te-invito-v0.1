/**
 * Detect allowed image MIME from magic bytes (do not trust client filename or multer mimetype alone).
 */

const JPEG = Buffer.from([0xff, 0xd8, 0xff]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const RIFF = Buffer.from([0x52, 0x49, 0x46, 0x46]);
const WEBP = Buffer.from([0x57, 0x45, 0x42, 0x50]);

export function detectImageMime(buffer: Buffer): string | null {
  if (buffer.length < 12) {
    return null;
  }

  if (buffer.subarray(0, 3).equals(JPEG)) {
    return 'image/jpeg';
  }

  if (buffer.subarray(0, 8).equals(PNG)) {
    return 'image/png';
  }

  if (
    buffer.subarray(0, 4).equals(RIFF) &&
    buffer.subarray(8, 12).equals(WEBP)
  ) {
    return 'image/webp';
  }

  return null;
}

export function looksLikeDataUrl(buffer: Buffer): boolean {
  if (buffer.length < 5) {
    return false;
  }
  const prefix = buffer.subarray(0, 32).toString('utf8').toLowerCase();
  return prefix.startsWith('data:');
}

export const BLOCKED_MIMES = new Set([
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'application/octet-stream',
]);
