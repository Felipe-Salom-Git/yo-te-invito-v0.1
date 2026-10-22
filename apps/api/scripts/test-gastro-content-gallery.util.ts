/**
 * G3.1 — GastroContent galleryUrls + legacy imageUrl fallback.
 * Run: pnpm --filter api run test:gastro-content-gallery
 */

import {
  normalizeGastroContentGalleryUrls,
  prepareGastroContentGalleryWrite,
  resolveGastroContentCoverImageUrl,
  resolveGastroContentGalleryUrls,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

assert(
  JSON.stringify(resolveGastroContentGalleryUrls({ imageUrl: 'https://a/x.jpg' })) ===
    JSON.stringify(['https://a/x.jpg']),
  'legacy imageUrl alone → one-item gallery',
);

assert(
  JSON.stringify(
    resolveGastroContentGalleryUrls({
      imageUrl: 'https://legacy.jpg',
      galleryUrls: ['https://a.jpg', 'https://b.jpg'],
    }),
  ) === JSON.stringify(['https://a.jpg', 'https://b.jpg']),
  'galleryUrls wins over legacy imageUrl',
);

assert(
  resolveGastroContentCoverImageUrl({
    imageUrl: null,
    galleryUrls: ['https://cover.jpg', 'https://two.jpg'],
  }) === 'https://cover.jpg',
  'cover is first gallery entry',
);

assert(
  JSON.stringify(normalizeGastroContentGalleryUrls([' a ', 'a', '', 'b', 1 as never])) ===
    JSON.stringify(['a', 'b']),
  'normalize trims + dedupes + skips non-strings',
);

const fromLegacyWrite = prepareGastroContentGalleryWrite({
  imageUrl: 'https://only.jpg',
  existingImageUrl: null,
  existingGalleryUrls: null,
});
assert(fromLegacyWrite.imageUrl === 'https://only.jpg', 'write from imageUrl sets cover');
assert(
  JSON.stringify(fromLegacyWrite.galleryUrls) === JSON.stringify(['https://only.jpg']),
  'write from imageUrl builds gallery',
);

const multi = prepareGastroContentGalleryWrite({
  galleryUrls: ['https://1.jpg', 'https://2.jpg'],
  existingImageUrl: 'https://old.jpg',
  existingGalleryUrls: ['https://old.jpg'],
});
assert(multi.imageUrl === 'https://1.jpg', 'explicit gallery sets cover to first');
assert(multi.galleryUrls.length === 2, 'explicit gallery preserved');

const clear = prepareGastroContentGalleryWrite({
  galleryUrls: [],
  existingImageUrl: 'https://old.jpg',
  existingGalleryUrls: ['https://old.jpg'],
});
assert(clear.imageUrl === null && clear.galleryUrls.length === 0, 'empty gallery clears cover');

console.log('\nAll G3.1 gastro content gallery checks passed.');
