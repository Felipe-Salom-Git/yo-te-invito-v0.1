import { randomUUID } from 'node:crypto';
import type { UploadPurpose, UploadScope } from '@yo-te-invito/shared';

const SCOPE_FOLDER: Record<Exclude<UploadScope, 'platform'>, string> = {
  event: 'events',
  producer: 'producers',
  gastro: 'gastro',
  rental: 'rentals',
  hotel: 'hotels',
  excursion: 'excursions',
};

export function extensionForMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      throw new Error(`Unsupported MIME for extension: ${mime}`);
  }
}

export function buildPublicObjectKey(params: {
  scope: UploadScope;
  entityId?: string;
  purpose: UploadPurpose;
  ext: string;
  now?: Date;
}): string {
  const now = params.now ?? new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const uuid = randomUUID();
  const ext = params.ext.replace(/^\./, '').toLowerCase();

  if (params.scope === 'platform') {
    return `public/platform/${params.purpose}/${yyyy}/${mm}/${uuid}.${ext}`;
  }

  const folder = SCOPE_FOLDER[params.scope];
  const entityId = sanitizeEntityId(params.entityId!);
  return `public/${folder}/${entityId}/${params.purpose}/${yyyy}/${mm}/${uuid}.${ext}`;
}

export function sanitizeEntityId(entityId: string): string {
  const trimmed = entityId.trim();
  if (!trimmed || trimmed.length > 64) {
    throw new Error('Invalid entityId length');
  }
  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    throw new Error('Invalid entityId path characters');
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    throw new Error('Invalid entityId characters');
  }
  return trimmed;
}

export function buildPublicObjectUrl(baseUrl: string, objectKey: string): string {
  const base = baseUrl.replace(/\/$/, '');
  const key = objectKey.replace(/^\//, '');
  return `${base}/${key}`;
}
