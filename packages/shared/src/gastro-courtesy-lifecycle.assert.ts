import {
  canIssueMasterQr,
  COURTESY_CLAIM_STATUSES_CANCELLED_ON_REJECT,
  COURTESY_PRE_APPROVAL_DISCOUNT_STATUSES,
  initialCourtesyDiscountStatus,
  isClaimVisibleToRecipient,
  isCourtesyClaimPendingDelivery,
  isCourtesyClaimRetained,
  isCourtesyPendingApproval,
  COURTESY_CLAIM_STATUSES_CANCELLED_ON_CAMPAIGN_CANCEL,
  courtesyStatusChangeBlocker,
  isCourtesyOnlyVisibility,
  isCourtesyValidityRangeValid,
  isGenericDiscountEditBlocked,
  isMasterQrRedeemable,
  shouldGenerateMasterQr,
  shouldNotifyDiscountExpired,
} from './gastro-courtesy-lifecycle';
import {
  gastroCourtesyRecipientsPreviewQuerySchema,
  parseQueryBoolean,
} from './schemas/gastro-courtesy-discounts';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

// --- G8.1 B2: query boolean must not use Boolean("false") === true ---
assert(parseQueryBoolean('false') === false, 'query "false" → false');
assert(parseQueryBoolean('FALSE') === false, 'query "FALSE" → false');
assert(parseQueryBoolean('0') === false, 'query "0" → false');
assert(parseQueryBoolean('') === false, 'query "" → false');
assert(parseQueryBoolean('true') === true, 'query "true" → true');
assert(parseQueryBoolean('1') === true, 'query "1" → true');
assert(parseQueryBoolean(true) === true, 'boolean true passes through');

const base = { gastroProfileId: 'profile-a' };
const off = gastroCourtesyRecipientsPreviewQuerySchema.parse({ ...base, sendToFollowers: 'false' });
assert(off.sendToFollowers === false, 'preview ?sendToFollowers=false is false (was true with z.coerce.boolean)');
const on = gastroCourtesyRecipientsPreviewQuerySchema.parse({ ...base, sendToFollowers: 'true' });
assert(on.sendToFollowers === true, 'preview ?sendToFollowers=true is true');
const omitted = gastroCourtesyRecipientsPreviewQuerySchema.parse(base);
assert(omitted.sendToFollowers === undefined, 'preview without sendToFollowers stays undefined');
assert(
  !gastroCourtesyRecipientsPreviewQuerySchema.safeParse({ ...base, sendToFollowers: 'maybe' }).success,
  'preview rejects non-boolean sendToFollowers',
);
const manual = gastroCourtesyRecipientsPreviewQuerySchema.parse({
  ...base,
  manualEmails: 'a@x.com, b@x.com',
  sendToFollowers: 'false',
});
assert(manual.manualEmails?.length === 2 && manual.sendToFollowers === false, 'manual emails only keeps followers off');

// --- G8.1 B6: validity window order ---
const d = (iso: string) => new Date(iso);
assert(
  isCourtesyValidityRangeValid(d('2026-10-23T00:00:00Z'), d('2026-10-30T23:59:59Z')),
  'validFrom < validTo is valid',
);
assert(
  isCourtesyValidityRangeValid(d('2026-10-23T00:00:00Z'), d('2026-10-23T00:00:00Z')),
  'same instant is valid',
);
assert(
  !isCourtesyValidityRangeValid(d('2026-11-01T00:00:00Z'), d('2026-10-30T23:59:59Z')),
  'validFrom after validTo is invalid',
);
assert(!isCourtesyValidityRangeValid(new Date('x'), d('2026-10-30T23:59:59Z')), 'invalid date is invalid');

// --- visibility helper ---
assert(isCourtesyOnlyVisibility('COURTESY_ONLY'), 'COURTESY_ONLY is courtesy');
assert(!isCourtesyOnlyVisibility('PUBLIC'), 'PUBLIC is not courtesy');
assert(!isCourtesyOnlyVisibility(null), 'null is not courtesy');
assert(!isCourtesyOnlyVisibility(undefined), 'undefined is not courtesy');

// --- G8.2: master QR ---
assert(!canIssueMasterQr('COURTESY_ONLY'), 'courtesy can never issue a master QR');
assert(canIssueMasterQr('PUBLIC'), 'public discount can issue a master QR');
assert(canIssueMasterQr(undefined), 'unknown visibility (legacy rows) behaves as public');
assert(
  !shouldGenerateMasterQr({ visibility: 'COURTESY_ONLY', existingQrToken: null }),
  'courtesy without token: do NOT generate one (reactivation/approval)',
);
assert(
  !shouldGenerateMasterQr({ visibility: 'COURTESY_ONLY', existingQrToken: 'x' }),
  'courtesy with legacy token: do not generate',
);
assert(
  shouldGenerateMasterQr({ visibility: 'PUBLIC', existingQrToken: null }),
  'public without token: generate',
);
assert(
  !shouldGenerateMasterQr({ visibility: 'PUBLIC', existingQrToken: 'x' }),
  'public with token: keep, do not regenerate',
);
assert(!isMasterQrRedeemable('COURTESY_ONLY'), 'scanner master path closed for courtesy');
assert(isMasterQrRedeemable('PUBLIC'), 'scanner master path open for public');

// --- G8.2: edit / status ---
assert(isGenericDiscountEditBlocked('COURTESY_ONLY'), 'generic edit blocked for courtesy');
assert(!isGenericDiscountEditBlocked('PUBLIC'), 'generic edit allowed for public');
assert(
  courtesyStatusChangeBlocker({ visibility: 'COURTESY_ONLY', currentStatus: 'CANCELLED', targetStatus: 'ACTIVE' }) ===
    'CANCELLED_IS_TERMINAL',
  'cancelled courtesy cannot be reactivated',
);
assert(
  courtesyStatusChangeBlocker({ visibility: 'COURTESY_ONLY', currentStatus: 'ACTIVE', targetStatus: 'CANCELLED' }) === null,
  'active courtesy can be cancelled',
);
assert(
  courtesyStatusChangeBlocker({ visibility: 'PUBLIC', currentStatus: 'CANCELLED', targetStatus: 'ACTIVE' }) === null,
  'public discount reactivation unchanged',
);
assert(
  COURTESY_CLAIM_STATUSES_CANCELLED_ON_CAMPAIGN_CANCEL.length === 1 &&
    COURTESY_CLAIM_STATUSES_CANCELLED_ON_CAMPAIGN_CANCEL[0] === 'ACTIVE',
  'only ACTIVE claims are cancelled with the campaign (USED stays USED)',
);
assert(!shouldNotifyDiscountExpired('COURTESY_ONLY'), 'no expiry notice for courtesy');
assert(shouldNotifyDiscountExpired('PUBLIC'), 'expiry notice kept for public discounts');

// --- G8.3 / G8.4: approval, retained claims, delivery ---
assert(initialCourtesyDiscountStatus('GASTRO_OWNER') === 'PENDING_REVIEW', 'owner courtesy is born PENDING_REVIEW');
assert(initialCourtesyDiscountStatus('ADMIN') === 'ACTIVE', 'admin courtesy is born ACTIVE');
assert(
  COURTESY_PRE_APPROVAL_DISCOUNT_STATUSES.length === 2 &&
    isCourtesyPendingApproval('PENDING_REVIEW') &&
    isCourtesyPendingApproval('COMMISSION_NEGOTIATION') &&
    !isCourtesyPendingApproval('ACTIVE') &&
    !isCourtesyPendingApproval(null),
  'pending-approval statuses',
);
assert(
  isCourtesyClaimRetained({ claimType: 'COURTESY', claimStatus: 'ACTIVE', parentStatus: 'PENDING_REVIEW' }),
  'ACTIVE courtesy claim of a pending parent is retained',
);
assert(
  !isCourtesyClaimRetained({ claimType: 'COURTESY', claimStatus: 'ACTIVE', parentStatus: 'ACTIVE' }) &&
    !isCourtesyClaimRetained({ claimType: 'PUBLIC_REQUEST', claimStatus: 'ACTIVE', parentStatus: 'PENDING_REVIEW' }) &&
    !isCourtesyClaimRetained({ claimType: 'COURTESY', claimStatus: 'CANCELLED', parentStatus: 'PENDING_REVIEW' }),
  'approved parent / public claim / cancelled claim are not retained',
);
assert(!isClaimVisibleToRecipient({ claimType: 'COURTESY', parentStatus: 'PENDING_REVIEW' }), 'retained courtesy claim hidden');
assert(!isClaimVisibleToRecipient({ claimType: 'COURTESY', parentStatus: 'COMMISSION_NEGOTIATION' }), 'negotiating courtesy claim hidden');
assert(!isClaimVisibleToRecipient({ claimType: 'COURTESY', parentStatus: 'REJECTED' }), 'rejected courtesy claim hidden');
assert(isClaimVisibleToRecipient({ claimType: 'COURTESY', parentStatus: 'ACTIVE' }), 'active (legacy or approved) courtesy claim visible');
assert(isClaimVisibleToRecipient({ claimType: 'COURTESY', parentStatus: 'CANCELLED' }), 'cancelled courtesy keeps history visible');
assert(isClaimVisibleToRecipient({ claimType: 'COURTESY', parentStatus: 'EXPIRED' }), 'expired courtesy keeps history visible');
assert(
  isClaimVisibleToRecipient({ claimType: 'PUBLIC_REQUEST', parentStatus: 'PENDING_REVIEW' }) &&
    isClaimVisibleToRecipient({ claimType: 'PUBLIC_REQUEST', parentStatus: 'REJECTED' }),
  'public claims visibility unchanged',
);
assert(
  COURTESY_CLAIM_STATUSES_CANCELLED_ON_REJECT.length === 1 && COURTESY_CLAIM_STATUSES_CANCELLED_ON_REJECT[0] === 'ACTIVE',
  'reject cancels only ACTIVE claims',
);
assert(
  isCourtesyClaimPendingDelivery({ claimType: 'COURTESY', claimStatus: 'ACTIVE', emailSentAt: null }) &&
    !isCourtesyClaimPendingDelivery({ claimType: 'COURTESY', claimStatus: 'ACTIVE', emailSentAt: new Date() }) &&
    !isCourtesyClaimPendingDelivery({ claimType: 'COURTESY', claimStatus: 'CANCELLED', emailSentAt: null }) &&
    !isCourtesyClaimPendingDelivery({ claimType: 'COURTESY', claimStatus: 'USED', emailSentAt: null }),
  'delivery targets only usable, never-delivered claims',
);

console.log('gastro-courtesy-lifecycle assertions passed');
