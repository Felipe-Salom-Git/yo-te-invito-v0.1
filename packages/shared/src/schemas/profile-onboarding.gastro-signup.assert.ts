/**
 * G7.10.8 — GASTRO signup is account-only by default; legacy local payload still accepted.
 * Run after `pnpm --filter @yo-te-invito/shared build`:
 *   node packages/shared/dist/schemas/profile-onboarding.gastro-signup.assert.js
 */
import { authRegisterRequestSchema } from './user.schema';
import {
  parseProfileSignupData,
  isGastroSignupLocalPayload,
  gastroProfileSignupLocalSchema,
} from './profile-onboarding';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

const accountOnlyUndefined = parseProfileSignupData('GASTRO', undefined);
assert(accountOnlyUndefined.success === true, 'undefined → success');
assert(
  accountOnlyUndefined.success && accountOnlyUndefined.data === null,
  'undefined → no local payload',
);

const accountOnlyNull = parseProfileSignupData('GASTRO', null);
assert(accountOnlyNull.success && accountOnlyNull.data === null, 'null → account-only');

const accountOnlyEmpty = parseProfileSignupData('GASTRO', {});
assert(accountOnlyEmpty.success && accountOnlyEmpty.data === null, '{} → account-only');

const legacy = {
  displayName: 'Café Demo',
  contactEmail: 'cafe@example.com',
  location: {
    province: 'Río Negro',
    city: 'San Carlos de Bariloche',
    address: 'Mitre 100',
  },
};
const legacyParsed = parseProfileSignupData('GASTRO', legacy);
assert(legacyParsed.success === true, 'legacy local → success');
assert(
  legacyParsed.success &&
    legacyParsed.data != null &&
    isGastroSignupLocalPayload(legacyParsed.data) &&
    legacyParsed.data.displayName === 'Café Demo',
  'legacy local → LocalInput',
);

const invalid = parseProfileSignupData('GASTRO', { displayName: 'x' });
assert(invalid.success === false, 'partial local → fail');

const localSchemaOk = gastroProfileSignupLocalSchema.safeParse(legacy);
assert(localSchemaOk.success === true, 'local schema accepts legacy');

const registerAccountOnly = authRegisterRequestSchema.safeParse({
  email: 'gastro@example.com',
  password: 'secret1',
  firstName: 'Ana',
  lastName: 'Gastro',
  profileType: 'GASTRO',
});
assert(registerAccountOnly.success === true, 'register GASTRO without profileData');

const registerProducerNeedsData = authRegisterRequestSchema.safeParse({
  email: 'prod@example.com',
  password: 'secret1',
  firstName: 'Prod',
  lastName: 'Owner',
  profileType: 'PRODUCER',
});
assert(registerProducerNeedsData.success === false, 'register PRODUCER still needs profileData');

console.log('OK: GASTRO signup account-only + legacy local payload');
