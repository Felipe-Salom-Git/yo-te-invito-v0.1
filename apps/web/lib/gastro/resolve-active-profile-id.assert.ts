/**
 * G9.4 — Switching locals must not fall back to the first ACTIVE when the
 * previous choice is still remembered, and status copy never exposes enums.
 * Run: pnpm --filter api run test:gastro-active-profile
 */
import { gastroLocationStatusLabel } from './gastro-location-status';
import { resolveActiveGastroProfileId } from './resolve-active-profile-id';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

const locations = [
  { id: 'local-a', status: 'ACTIVE' },
  { id: 'local-b', status: 'ACTIVE' },
];

assert(resolveActiveGastroProfileId('local-b', locations) === 'local-b', 'URL B wins');
assert(resolveActiveGastroProfileId('local-b', locations, 'local-a') === 'local-b', 'URL beats remembered');
assert(
  resolveActiveGastroProfileId(undefined, locations, 'local-b') === 'local-b',
  'remembered B is kept when the URL drops profileId',
);
assert(
  resolveActiveGastroProfileId(undefined, locations, 'foreign') === 'local-a',
  'unknown remembered id falls back to the first ACTIVE',
);
assert(resolveActiveGastroProfileId('foreign', locations, 'local-b') === 'local-b', 'bad URL uses remembered B');
assert(
  resolveActiveGastroProfileId(undefined, [{ id: 'p', status: 'PENDING' }]) === 'p',
  'single non-active local is kept',
);

assert(gastroLocationStatusLabel('PENDING') === 'Pendiente de aprobación', 'pending label');
assert(gastroLocationStatusLabel('ACTIVE') === 'Local activo', 'active label');
assert(gastroLocationStatusLabel('REJECTED') === 'Solicitud rechazada', 'rejected label');
assert(gastroLocationStatusLabel('SUSPENDED') === 'Local suspendido', 'suspended label');
assert(!gastroLocationStatusLabel('PENDING').includes('PENDING'), 'label hides the enum');
assert(gastroLocationStatusLabel('active') === 'Local activo', 'lowercase status still maps');

console.log('OK: gastro active profile');
