/**
 * G3.3 — Gallery add/remove/reorder helpers (no storage delete).
 * Run: pnpm --filter api run test:gastro-content-gallery-ops
 */

import {
  GASTRO_CONTENT_GALLERY_MAX,
  normalizeGastroContentGalleryUrls,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

function append(current: string[], url: string): string[] {
  return normalizeGastroContentGalleryUrls([...current, url]).slice(
    0,
    GASTRO_CONTENT_GALLERY_MAX,
  );
}

function remove(current: string[], url: string): string[] {
  return current.filter((u) => u !== url);
}

function move(current: string[], fromIndex: number, toIndex: number): string[] {
  const next = [...current];
  const [item] = next.splice(fromIndex, 1);
  if (!item) return current;
  next.splice(toIndex, 0, item);
  return next;
}

assert(
  JSON.stringify(append(['https://a.jpg'], 'https://b.jpg')) ===
    JSON.stringify(['https://a.jpg', 'https://b.jpg']),
  'append adds image',
);

assert(
  JSON.stringify(remove(['https://a.jpg', 'https://b.jpg'], 'https://a.jpg')) ===
    JSON.stringify(['https://b.jpg']),
  'remove drops URL without touching storage',
);

assert(
  JSON.stringify(move(['https://a.jpg', 'https://b.jpg', 'https://c.jpg'], 2, 0)) ===
    JSON.stringify(['https://c.jpg', 'https://a.jpg', 'https://b.jpg']),
  'reorder moves cover candidate to front',
);

const many = Array.from({ length: GASTRO_CONTENT_GALLERY_MAX + 5 }, (_, i) => `https://i/${i}.jpg`);
assert(append([], many[0]!).length === 1, 'append single');
assert(
  normalizeGastroContentGalleryUrls(many).length === GASTRO_CONTENT_GALLERY_MAX,
  'cap at GASTRO_CONTENT_GALLERY_MAX',
);

console.log('\nAll G3.3 gastro content gallery ops checks passed.');
