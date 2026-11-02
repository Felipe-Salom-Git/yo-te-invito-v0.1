/**
 * G12.2-B — Gastro promo event portal form: validation, payload mapping, tabs and lifecycle labels.
 * Run: pnpm --filter api run test:gastro-promo-events
 */
import { gastroPromoEventCreateSchema } from '@yo-te-invito/shared';
import {
  EMPTY_GASTRO_PROMO_EVENT_FORM,
  GASTRO_CONTENT_TAB,
  buildGastroPromoEventPayload,
  canSubmitGastroPromoEvent,
  gastroPromoEventPublicHref,
  gastroPromoEventToForm,
  resolveGastroContentTab,
} from './gastroPromoEvents';
import { getPlaceHeroCtaLabel } from '@/lib/home/contentRoutes';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

assert(resolveGastroContentTab('eventos') === GASTRO_CONTENT_TAB.EVENTS, '?tab=eventos → Eventos');
assert(resolveGastroContentTab(null) === GASTRO_CONTENT_TAB.PUBLICATIONS, 'default tab → Publicaciones');
assert(resolveGastroContentTab('x') === GASTRO_CONTENT_TAB.PUBLICATIONS, 'unknown tab → Publicaciones');

const empty = buildGastroPromoEventPayload(EMPTY_GASTRO_PROMO_EVENT_FORM);
assert(!empty.ok && Boolean(empty.errors.title) && Boolean(empty.errors.startLocal), 'empty form → title + date errors');

const badEnd = buildGastroPromoEventPayload({
  ...EMPTY_GASTRO_PROMO_EVENT_FORM,
  title: 'Jazz',
  startLocal: '2026-12-10T22:00',
  endLocal: '2026-12-10T20:00',
});
assert(!badEnd.ok && Boolean(badEnd.errors.endLocal), 'end before start rejected');

const otherVenue = buildGastroPromoEventPayload({
  ...EMPTY_GASTRO_PROMO_EVENT_FORM,
  title: 'Jazz',
  startLocal: '2026-12-10T22:00',
  atLocal: false,
});
assert(!otherVenue.ok && Boolean(otherVenue.errors.venueName), 'custom venue requires a place name');

const ok = buildGastroPromoEventPayload({
  ...EMPTY_GASTRO_PROMO_EVENT_FORM,
  title: '  Noche de jazz ',
  description: 'En vivo',
  startLocal: '2026-12-10T22:00',
  galleryUrls: ['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg'],
  tagIds: ['tag-1'],
});
assert(ok.ok, 'valid form');
if (ok.ok) {
  assert(ok.data.title === 'Noche de jazz', 'title trimmed');
  assert(ok.data.coverImageUrl === 'https://cdn.test/a.jpg', 'first image = cover');
  assert(ok.data.venueName === null && ok.data.venueAddress === null, 'at the local → API defaults the venue');
  const parsed = gastroPromoEventCreateSchema.safeParse({ ...ok.data, profileId: 'gp-a', submitForReview: true });
  assert(parsed.success, 'payload passes the shared Zod create schema');
  const keys = Object.keys(ok.data);
  assert(!keys.some((k) => /ticket|price|capacity/i.test(k)), 'no ticketing / price / capacity fields');
}

assert(canSubmitGastroPromoEvent('DRAFT') && canSubmitGastroPromoEvent('CANCELLED'), 'draft / rejected can be submitted');
assert(!canSubmitGastroPromoEvent('PENDING') && !canSubmitGastroPromoEvent('APPROVED'), 'pending / approved cannot');
assert(gastroPromoEventPublicHref('evt-1') === '/events/evt-1', 'public href = event detail');

const roundTrip = gastroPromoEventToForm(
  {
    id: 'e', gastroProfileId: 'gp', title: 'T', description: null, coverImageUrl: null, galleryUrls: [],
    startAt: '2026-12-10T22:00:00.000Z', endAt: null, venueName: 'Local A', venueAddress: 'Calle 1', city: 'Bariloche',
    province: null, subcategoryId: null, subcategoryName: null, tags: [{ id: 't1', name: 'Jazz', slug: 'jazz' }],
    status: 'DRAFT', publishedAt: null, createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z',
  },
  { displayName: 'Local A', address: 'Calle 1' },
);
assert(roundTrip.atLocal && roundTrip.tagIds.join() === 't1', 'edit form: venue = local detected, tags kept');

// G12.2-C — event detail hero CTA: no «Comprar entradas» on events without ticketing.
assert(getPlaceHeroCtaLabel('event', { isGeneralPublication: true }) === 'Más información', 'publicity event CTA = Más información');
assert(getPlaceHeroCtaLabel('event', { isGeneralPublication: false }) === 'Comprar entradas', 'ticketed event CTA unchanged');
assert(getPlaceHeroCtaLabel('gastro', { isGeneralPublication: true }) === 'Reservar', 'other categories unchanged');

console.log('OK: gastro promo event form');
