/**
 * G11.2 — Cross-vertical public share never leaks tenantId, query strings or portal/admin paths.
 * Run: pnpm --filter api run test:public-share
 */
import { getContentDetailHref } from '../home/contentRoutes';
import { buildGastroLocationShareMessage, buildPublicGastroCanonicalUrl } from './gastroLocationShare';
import {
  buildPublicationAnchorId,
  buildPublicShareMessage,
  buildPublicShareUrl,
  isPublicShareUrl,
} from './publicShare';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

const ORIGIN = 'https://yoteinvito.club/';

const cases: Array<[string, string]> = [
  ['event', getContentDetailHref({ id: 'ev1', category: 'event' })],
  ['gastro', getContentDetailHref({ id: 'ev2', category: 'gastro', gastroProfileId: 'gp1' })],
  ['activity', getContentDetailHref({ id: 'ex1', category: 'excursion' })],
  ['rental', getContentDetailHref({ id: 'rt1', category: 'rental' })],
  ['hotel', getContentDetailHref({ id: 'ht1', category: 'hotel' })],
  ['discount', '/descuentos/d1'],
  ['producer', '/producers/p1'],
];
for (const [label, path] of cases) {
  const url = buildPublicShareUrl(ORIGIN, path);
  assert(isPublicShareUrl(url), `${label}: ${url} is a public share URL`);
}

const tenantHref = getContentDetailHref({ id: 'ev1', category: 'event' }, 'tenant-other');
assert(tenantHref.includes('tenantId='), 'fixture: discovery href carries a tenant query');
const withTenant = buildPublicShareUrl(ORIGIN, tenantHref);
assert(withTenant === 'https://yoteinvito.club/events/ev1', 'tenantId query is dropped');

const publication = buildPublicShareUrl(ORIGIN, `/gastronomicos/gp1#${buildPublicationAnchorId('c1')}`);
assert(publication === 'https://yoteinvito.club/gastronomicos/gp1#publicacion-c1', 'publication keeps its anchor');
assert(isPublicShareUrl(publication), 'publication anchor URL is public');
assert(
  buildPublicShareUrl(ORIGIN, '/events/ev1#reviews') === 'https://yoteinvito.club/events/ev1',
  'non-publication hash is dropped',
);

assert(!isPublicShareUrl('https://yoteinvito.club/events/ev1?tenantId=tenant-demo'), 'query URL rejected');
assert(!isPublicShareUrl('https://yoteinvito.club/gastro/local?profileId=gp1'), 'portal URL rejected');
assert(!isPublicShareUrl('https://yoteinvito.club/admin/gastronomicos/gp1'), 'admin URL rejected');
assert(!isPublicShareUrl('https://yoteinvito.club/events/'), 'path without id rejected');

const gastroUrl = buildPublicGastroCanonicalUrl(ORIGIN, 'gp1');
assert(
  buildPublicShareMessage('place', 'La Parrilla', gastroUrl) ===
    buildGastroLocationShareMessage('La Parrilla', gastroUrl),
  'place message is identical to the G9 gastro message',
);
assert(
  buildPublicShareMessage('event', 'Fiesta', 'https://x/events/1') ===
    'Mirá este evento en Yo Te Invito:\nFiesta\nhttps://x/events/1',
  'event message wording',
);

console.log('OK: public share');
