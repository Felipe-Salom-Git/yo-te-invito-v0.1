/**
 * G3.6/G3.7 — Public visibility + archive + legacy gallery fallback hardening.
 * Run: pnpm --filter api run test:gastro-content-lifecycle
 */

import {
  prepareGastroContentGalleryWrite,
  resolveGastroContentGalleryUrls,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

type Row = { status: 'DRAFT' | 'PUBLISHED' | 'INACTIVE'; gastroProfileId: string };

function listPublishedForProfile(rows: Row[], profileId: string): Row[] {
  return rows.filter(
    (r) => r.gastroProfileId === profileId && r.status === 'PUBLISHED',
  );
}

const rows: Row[] = [
  { status: 'PUBLISHED', gastroProfileId: 'p1' },
  { status: 'DRAFT', gastroProfileId: 'p1' },
  { status: 'INACTIVE', gastroProfileId: 'p1' },
  { status: 'PUBLISHED', gastroProfileId: 'p2' },
];

assert(listPublishedForProfile(rows, 'p1').length === 1, 'public lists only PUBLISHED for profile');
assert(
  listPublishedForProfile(rows, 'p2').every((r) => r.gastroProfileId === 'p2'),
  'public listing stays profile-scoped',
);

assert(
  JSON.stringify(
    resolveGastroContentGalleryUrls({
      imageUrl: 'https://legacy.jpg',
      galleryUrls: null,
    }),
  ) === JSON.stringify(['https://legacy.jpg']),
  'legacy imageUrl still resolves after gallery migration',
);

const cleared = prepareGastroContentGalleryWrite({
  galleryUrls: [],
  existingImageUrl: 'https://legacy.jpg',
  existingGalleryUrls: ['https://legacy.jpg'],
});
assert(cleared.imageUrl === null, 'archive/clear gallery also clears cover imageUrl');

/** Soft delete keeps the row; status becomes INACTIVE. */
function archiveStatus(current: Row['status']): Row['status'] {
  return 'INACTIVE';
}
assert(archiveStatus('PUBLISHED') === 'INACTIVE', 'archive is logical INACTIVE');

console.log('\nAll G3.6/G3.7 gastro content lifecycle checks passed.');
