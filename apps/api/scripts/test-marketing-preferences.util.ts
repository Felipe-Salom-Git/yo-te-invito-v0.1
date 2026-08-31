/**
 * Marketing consent helpers (no DB).
 * Run: pnpm --filter api run test:marketing-preferences
 */

import {
  buildMarketingUnsubscribePreview,
  buildMarketingUnsubscribeResult,
  emptyMeMarketingPreferences,
  isEmailCampaignEligible,
  isMarketingUnsubscribeTokenShape,
  isTransactionalEmailIndependentOfMarketingOptIn,
  patchMeMarketingPreferencesBodySchema,
  shouldSendActivityCouponClaimEmail,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

const baseUser = {
  email: 'user@example.com',
  emailVerified: '2026-01-01T00:00:00.000Z',
  status: 'ACTIVE',
  role: 'USER',
  userTenantId: 't1',
  campaignTenantId: 't1',
};

assert(
  emptyMeMarketingPreferences(false).emailOptIn === false,
  'existing user default is not opted in',
);
assert(
  emptyMeMarketingPreferences(false).whatsappOptIn === false,
  'whatsapp default false',
);
assert(
  emptyMeMarketingPreferences(false).whatsappAvailable === false,
  'whatsapp unavailable without provider',
);
assert(
  emptyMeMarketingPreferences(false).source === null,
  'no preference row → source null',
);

assert(
  isEmailCampaignEligible({ ...baseUser, emailOptIn: null }).ok === false,
  'no preference row is not eligible',
);
assert(
  (isEmailCampaignEligible({ ...baseUser, emailOptIn: null }) as { reason: string }).reason ===
    'NO_PREFERENCE',
  'skip reason NO_PREFERENCE',
);
assert(
  isEmailCampaignEligible({ ...baseUser, emailOptIn: false }).ok === false,
  'opt-out is not eligible',
);
assert(
  isEmailCampaignEligible({ ...baseUser, emailOptIn: true }).ok === true,
  'opt-in + verified email eligible',
);
assert(
  isEmailCampaignEligible({ ...baseUser, emailOptIn: true, email: null }).ok === false,
  'nullable email skipped',
);
assert(
  isEmailCampaignEligible({ ...baseUser, emailOptIn: true, email: '   ' }).ok === false,
  'blank email skipped',
);
assert(
  isEmailCampaignEligible({ ...baseUser, emailOptIn: true, emailVerified: null }).ok === false,
  'unverified email skipped',
);
assert(
  isEmailCampaignEligible({ ...baseUser, emailOptIn: true, status: 'DELETED' }).ok === false,
  'deleted user skipped',
);
assert(
  isEmailCampaignEligible({ ...baseUser, emailOptIn: true, role: 'SCANNER' }).ok === false,
  'scanner role skipped',
);
assert(
  isEmailCampaignEligible({ ...baseUser, emailOptIn: true, userTenantId: 'other' }).ok === false,
  'cross-tenant skipped',
);

assert(isMarketingUnsubscribeTokenShape('a'.repeat(64)) === true, '64 hex token shape ok');
assert(isMarketingUnsubscribeTokenShape('zz') === false, 'invalid token rejected');
assert(isMarketingUnsubscribeTokenShape('user-123') === false, 'userId is not a token');
assert(isMarketingUnsubscribeTokenShape('user@x.com') === false, 'email is not a token');

assert(
  patchMeMarketingPreferencesBodySchema.safeParse({ emailOptIn: true }).success,
  'opt-in patch ok',
);
assert(
  patchMeMarketingPreferencesBodySchema.safeParse({ emailOptIn: false }).success,
  'opt-out patch ok',
);
assert(
  patchMeMarketingPreferencesBodySchema.safeParse({}).success === false,
  'empty patch rejected',
);
assert(
  patchMeMarketingPreferencesBodySchema.safeParse({ emailOptIn: true, extra: 1 }).success ===
    false,
  'strict patch rejects extra keys',
);

assert(
  isTransactionalEmailIndependentOfMarketingOptIn() === true,
  'transactional emails are a separate channel',
);
assert(
  shouldSendActivityCouponClaimEmail('user@example.com') === true,
  'claim QR email still sends with marketing opt-out conceptually',
);
assert(
  shouldSendActivityCouponClaimEmail(null) === false,
  'claim QR still skips null email',
);

assert(
  buildMarketingUnsubscribePreview(true).emailOptIn === true &&
    buildMarketingUnsubscribePreview(true).alreadyUnsubscribed === false,
  'GET preview subscribed user is read-only shape',
);
assert(
  buildMarketingUnsubscribePreview(false).alreadyUnsubscribed === true,
  'GET preview already unsubscribed',
);
assert(
  buildMarketingUnsubscribeResult(true).alreadyUnsubscribed === false,
  'POST first unsubscribe marks changed',
);
assert(
  buildMarketingUnsubscribeResult(false).alreadyUnsubscribed === true,
  'POST repeated unsubscribe is idempotent',
);
assert(
  isEmailCampaignEligible({ ...baseUser, emailOptIn: false }).ok === false,
  'unsubscribe EMAIL blocks campaign eligibility',
);
assert(
  isTransactionalEmailIndependentOfMarketingOptIn() === true,
  'unsubscribe EMAIL does not block verification/claim conceptually',
);
assert(
  shouldSendActivityCouponClaimEmail('user@example.com') === true,
  'unsubscribe EMAIL does not block Gastro/Activity claim email gate',
);

console.log('All marketing preference tests passed');
