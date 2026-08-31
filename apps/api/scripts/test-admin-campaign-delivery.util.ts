/**
 * Admin campaign EMAIL delivery rules (no DB / no SMTP).
 * Run: pnpm --filter api run test:admin-campaign-delivery
 */

import {
  evaluateCampaignEmailDelivery,
  isCampaignProviderErrorRetryable,
  isTransactionalEmailIndependentOfMarketingOptIn,
  sanitizeCampaignErrorCode,
  shouldSendActivityCouponClaimEmail,
} from '@yo-te-invito/shared';
import { renderAdminCampaign } from '../src/email/templates/templates/admin-campaign.template';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

const eligibleBase = {
  deliveryStatus: 'QUEUED',
  cancelRequested: false,
  emailOptIn: true,
  email: 'user@example.com',
  emailVerified: new Date(),
  status: 'ACTIVE',
  role: 'USER',
  userTenantId: 't1',
  campaignTenantId: 't1',
  userGone: false,
  contentEligible: true,
  channel: 'EMAIL',
};

assert(evaluateCampaignEmailDelivery(eligibleBase).action === 'send', 'eligible recipient sends');
assert(
  evaluateCampaignEmailDelivery({ ...eligibleBase, emailOptIn: false }).action === 'skip',
  'no opt-in skipped',
);
assert(
  (evaluateCampaignEmailDelivery({ ...eligibleBase, emailOptIn: false }) as { reason: string })
    .reason === 'OPT_OUT',
  'opt-out reason',
);
assert(
  evaluateCampaignEmailDelivery({ ...eligibleBase, email: null }).action === 'skip',
  'null email skipped',
);
assert(
  evaluateCampaignEmailDelivery({ ...eligibleBase, emailVerified: null }).action === 'skip',
  'unverified skipped',
);
assert(
  evaluateCampaignEmailDelivery({ ...eligibleBase, userGone: true }).action === 'skip',
  'deleted user skipped',
);
assert(
  evaluateCampaignEmailDelivery({
    ...eligibleBase,
    emailOptIn: false,
  }).action === 'skip',
  'unsubscribe before worker skipped',
);
assert(
  evaluateCampaignEmailDelivery({ ...eligibleBase, deliveryStatus: 'SENT' }).action ===
    'already_sent',
  'duplicate send is no-op',
);
assert(
  evaluateCampaignEmailDelivery({ ...eligibleBase, contentEligible: false }).action === 'skip',
  'expired content skipped in worker',
);
assert(
  evaluateCampaignEmailDelivery({ ...eligibleBase, channel: 'WHATSAPP' }).action === 'skip',
  'whatsapp not configured skipped',
);
assert(
  evaluateCampaignEmailDelivery({ ...eligibleBase, cancelRequested: true }).action === 'skip',
  'cancel requested skipped',
);

assert(
  isCampaignProviderErrorRetryable('SMTP_SEND_FAILED', true) === true,
  'temporary SMTP retries',
);
assert(
  isCampaignProviderErrorRetryable('SMTP_NOT_CONFIGURED', false) === false,
  'SMTP_NOT_CONFIGURED is permanent',
);
assert(
  isCampaignProviderErrorRetryable('SMTP_REJECTED', true) === false,
  'permanent invalid recipient does not retry',
);

assert(sanitizeCampaignErrorCode('SMTP password=secret') === 'PROVIDER_ERROR', 'sanitize secrets');
assert(sanitizeCampaignErrorCode('SMTP_SEND_FAILED') === 'SMTP_SEND_FAILED', 'keep safe codes');

assert(
  isTransactionalEmailIndependentOfMarketingOptIn() === true,
  'transactional emails ignore marketing opt-in',
);
assert(
  shouldSendActivityCouponClaimEmail('user@example.com') === true,
  'claim QR email still sends without marketing opt-in',
);

const rendered = renderAdminCampaign({
  subject: 'Promo',
  headline: 'Headline',
  body: 'Cuerpo editorial',
  contentTitle: '2x1',
  contentBenefit: '2x1',
  ctaLabel: 'Ver',
  ctaUrl: 'https://yoteinvito.club/descuentos/1',
  unsubscribeUrl: 'https://yoteinvito.club/baja-promos?token=' + 'ab'.repeat(32),
});
assert(rendered.subject === 'Promo', 'campaign subject wins');
assert(rendered.html.includes('baja-promos?token='), 'unsubscribe in HTML');
assert(rendered.html.includes('Cuerpo editorial'), 'body escaped into HTML');
assert(!rendered.html.includes('tracking'), 'no tracking pixel copy');
assert(!/pixel|open-track|cid:open/i.test(rendered.html), 'no tracking pixel markup');
assert(rendered.html.includes('<script') === false, 'no script tags');

console.log('All admin campaign delivery tests passed');
