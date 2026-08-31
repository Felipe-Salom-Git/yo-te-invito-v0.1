/**
 * Operational expired-benefits digest (no marketing consent).
 * Run: pnpm --filter api run test:admin-expired-benefits-digest
 */

import {
  EXPIRED_BENEFITS_DIGEST_KIND,
  expiredBenefitsDigestKey,
  formatExpiredBenefitsDigestLines,
  isTransactionalEmailIndependentOfMarketingOptIn,
  shouldSendExpiredBenefitsDigest,
} from '@yo-te-invito/shared';
import { renderAdminExpiredBenefitsDigest } from '../src/email/templates/templates/admin-expired-benefits-digest.template';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

assert(EXPIRED_BENEFITS_DIGEST_KIND === 'EXPIRED_BENEFITS', 'digest kind');
assert(expiredBenefitsDigestKey(new Date('2026-08-31T12:00:00.000Z')) === '2026-08-31', 'UTC date key');
assert(
  shouldSendExpiredBenefitsDigest({ gastroExpiredCount: 0, activityCouponExpiredCount: 0 }) ===
    false,
  'empty window does not send',
);
assert(
  shouldSendExpiredBenefitsDigest({ gastroExpiredCount: 1, activityCouponExpiredCount: 0 }) === true,
  'gastro expired sends digest',
);
assert(
  formatExpiredBenefitsDigestLines(['a', 'b', 'c'], 2).extraCount === 1,
  'extra titles counted',
);
assert(
  isTransactionalEmailIndependentOfMarketingOptIn() === true,
  'digest is operational — marketing opt-in is irrelevant',
);

const rendered = renderAdminExpiredBenefitsDigest({
  digestDate: '2026-08-31',
  gastroCount: '1',
  couponCount: '0',
  gastroLines: '2x1',
  couponLines: '',
  gastroExtraCount: '0',
  couponExtraCount: '0',
  adminUrl: 'https://yoteinvito.club/admin',
});
assert(rendered.subject.includes('Beneficios vencidos'), 'digest subject');
assert(rendered.html.includes('No es una campaña comercial'), 'operational copy');
assert(!rendered.html.includes('baja-promos'), 'digest has no marketing unsubscribe');

console.log('All expired benefits digest tests passed');
