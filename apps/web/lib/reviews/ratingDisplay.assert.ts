/**
 * G11.1 — Rating faces use the new icon set; labels and the stored 1–10 scale are unchanged.
 * Run: pnpm --filter api run test:rating-face-icons
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  VISUAL_FACE_META,
  internalTenToVisualStars,
  publicFaceFromTen,
  visualStarsToInternalTen,
  type VisualFaceLevel,
} from './ratingDisplay';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

const EXPECTED_LABELS: Record<VisualFaceLevel, string> = {
  1: 'Muy insatisfecho',
  2: 'Insatisfecho',
  3: 'Neutral',
  4: 'Conforme',
  5: 'Muy conforme',
};
const publicDir = join(__dirname, '..', '..', 'public');

for (const level of [1, 2, 3, 4, 5] as VisualFaceLevel[]) {
  const face = VISUAL_FACE_META[level];
  assert(face.label === EXPECTED_LABELS[level], `level ${level} keeps label «${EXPECTED_LABELS[level]}»`);
  assert(face.iconSrc === `/icons/ratings/rating-face-${level}.png`, `level ${level} → rating-face-${level}.png`);
  assert(existsSync(join(publicDir, face.iconSrc)), `asset for level ${level} exists`);
  assert(visualStarsToInternalTen(level) === level * 2, `level ${level} still persists ${level * 2}/10`);
}

assert(internalTenToVisualStars(10) === 5 && internalTenToVisualStars(2) === 1, '1–10 ↔ 1–5 mapping unchanged');
assert(publicFaceFromTen(10)?.level === 5, 'best rating → best face');
assert(publicFaceFromTen(1)?.level === 1, 'worst rating → worst face');
assert(publicFaceFromTen(0) === null && publicFaceFromTen(null) === null, 'no rating → no face');

console.log('OK: rating face icons');
