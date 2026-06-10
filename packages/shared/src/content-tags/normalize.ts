import {
  CONTENT_TAG_NAME_MAX_LENGTH,
  CONTENT_TAG_NAME_MIN_LENGTH,
  CONTENT_TAG_SLUG_MAX_LENGTH,
} from '../constants/content-tags';

/** Strip leading #, trim, collapse internal spaces — display name. */
export function normalizeContentTagName(raw: string): string {
  const trimmed = raw.trim().replace(/^#+/, '').replace(/\s+/g, ' ').trim();
  return trimmed.slice(0, CONTENT_TAG_NAME_MAX_LENGTH);
}

export function slugifyContentTagName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, CONTENT_TAG_SLUG_MAX_LENGTH);
}

export function isValidContentTagName(name: string): boolean {
  const n = normalizeContentTagName(name);
  if (n.length < CONTENT_TAG_NAME_MIN_LENGTH) return false;
  return /^[\p{L}\p{N}][\p{L}\p{N}\s'.-]*$/u.test(n);
}

/** Visual hashtag for UI — does not include invalid empty names. */
export function formatContentTagHashtag(name: string): string {
  const n = normalizeContentTagName(name);
  return n ? `#${n}` : '';
}
