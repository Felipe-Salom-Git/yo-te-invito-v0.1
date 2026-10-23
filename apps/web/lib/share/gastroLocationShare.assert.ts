/**
 * G9.1 / G9.2 — Public gastro share URL never includes tenantId or a portal path.
 * Run: pnpm --filter api run test:gastro-location-share
 */
import {
  buildGastroLocationShareMessage,
  buildPublicGastroCanonicalUrl,
  buildWhatsAppShareHref,
  canShareGastroLocation,
  isPublicGastroShareUrl,
} from './gastroLocationShare';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

assert(canShareGastroLocation('ACTIVE'), 'ACTIVE can share');
assert(!canShareGastroLocation('PENDING'), 'PENDING cannot share');
assert(!canShareGastroLocation('REJECTED'), 'REJECTED cannot share');
assert(!canShareGastroLocation('SUSPENDED'), 'SUSPENDED cannot share');
assert(!canShareGastroLocation('DRAFT'), 'DRAFT cannot share');

const url = buildPublicGastroCanonicalUrl('https://yoteinvito.club/', 'local 1');
assert(
  url === 'https://yoteinvito.club/gastronomicos/local%201',
  'canonical URL strips trailing slash and encodes the id',
);
assert(!url.includes('tenantId'), 'share URL has no tenantId');
assert(!url.includes('/gastro/'), 'share URL is not the portal');
assert(!url.includes('/admin/'), 'share URL is not admin');
assert(isPublicGastroShareUrl(url), 'canonical URL is recognized as public');
assert(
  !isPublicGastroShareUrl('https://yoteinvito.club/gastronomicos/local-1?tenantId=tenant-demo'),
  'tenant query is not a share URL',
);
assert(
  !isPublicGastroShareUrl('https://yoteinvito.club/gastro/local?profileId=local-1'),
  'portal URL is not a share URL',
);

const message = buildGastroLocationShareMessage('La Parrilla', url);
assert(
  message === `Mirá este lugar en Yo Te Invito:\nLa Parrilla\n${url}`,
  'share message is name + canonical URL',
);
assert(!message.includes('tenantId'), 'message has no tenantId');

const wa = buildWhatsAppShareHref(message);
assert(wa.startsWith('https://wa.me/?text='), 'WhatsApp share has no destination phone');
assert(decodeURIComponent(wa.slice('https://wa.me/?text='.length)) === message, 'WhatsApp text is the share message');

console.log('OK: gastro location share');
