/**
 * G11.2 — Home covers for Eventos / Actividades / Rentals come from the official local assets.
 * Run: pnpm --filter api run test:home-covers
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  CATEGORY_GATEWAY_OPTIONS,
  HOME_COVER_IMAGES,
  getCategoryCoverImage,
} from './categoryGatewayConfig';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

const publicDir = join(__dirname, '..', '..', 'public');

for (const id of ['event', 'excursion', 'rental'] as const) {
  const option = CATEGORY_GATEWAY_OPTIONS.find((o) => o.id === id);
  assert(option, `${id}: gateway option exists`);
  assert(option.imageSrc === HOME_COVER_IMAGES[id], `${id}: tile uses the official cover`);
  assert(!option.imageSrc.startsWith('http'), `${id}: cover is a local asset (no placeholder URL)`);
  assert(existsSync(join(publicDir, option.imageSrc)), `${id}: ${option.imageSrc} exists`);
  assert(Boolean(option.imagePosition), `${id}: has explicit framing`);
  assert(getCategoryCoverImage(id)?.src === option.imageSrc, `${id}: landing empty hero uses the same cover`);
}
assert(getCategoryCoverImage('gastro') === null, 'gastro keeps its current tile (not part of G11.2)');

console.log('OK: home covers');
