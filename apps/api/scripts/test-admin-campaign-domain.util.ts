/**
 * Admin campaign domain helpers (no DB).
 * Run: pnpm --filter api run test:admin-campaign-domain
 */

import {
  canArchiveCampaign,
  canCancelCampaign,
  canEditCampaignDraft,
  canHardDeleteCampaign,
  canSendCampaign,
  canonicalCampaignContentPath,
  createAdminCampaignBodySchema,
  canSendWhatsAppCampaign,
  getWhatsAppCampaignChannelStatus,
  finalizeCampaignStatus,
  isAllowedCampaignCtaUrl,
  isEmailCampaignEligible,
  maskEmailHint,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

assert(canEditCampaignDraft('DRAFT'), 'draft editable');
assert(!canEditCampaignDraft('SENDING'), 'sending not editable');
assert(canSendCampaign('DRAFT'), 'draft can send');
assert(!canSendWhatsAppCampaign(), 'whatsapp send disabled without adapter');
assert(
  getWhatsAppCampaignChannelStatus().status === 'NOT_CONFIGURED',
  'whatsapp provider status NOT_CONFIGURED',
);
assert(getWhatsAppCampaignChannelStatus().sendEnabled === false, 'whatsapp sendEnabled false');
assert(!canSendCampaign('SENDING'), 'sending cannot send again (idempotent lock)');
assert(canCancelCampaign('DRAFT') && canCancelCampaign('SENDING'), 'cancel draft/sending');
assert(!canCancelCampaign('COMPLETED'), 'completed not cancelled as draft');
assert(canHardDeleteCampaign('DRAFT') && !canHardDeleteCampaign('COMPLETED'), 'delete only draft');
assert(canArchiveCampaign('COMPLETED') && !canArchiveCampaign('DRAFT'), 'archive finished only');

assert(
  finalizeCampaignStatus({ sent: 3, skipped: 0, failed: 0, cancelRequested: false }) ===
    'COMPLETED',
  'all sent → COMPLETED',
);
assert(
  finalizeCampaignStatus({ sent: 2, skipped: 1, failed: 0, cancelRequested: false }) ===
    'PARTIAL',
  'mix → PARTIAL',
);
assert(
  finalizeCampaignStatus({ sent: 0, skipped: 2, failed: 0, cancelRequested: false }) === 'FAILED',
  'none sent → FAILED',
);
assert(
  finalizeCampaignStatus({ sent: 0, skipped: 1, failed: 0, cancelRequested: true }) ===
    'CANCELLED',
  'cancel before send → CANCELLED',
);

assert(
  canonicalCampaignContentPath('GASTRO_DISCOUNT', 'abc') === '/descuentos/abc',
  'gastro path',
);
assert(
  canonicalCampaignContentPath('ACTIVITY_COUPON', 'abc') === '/excursiones/cupones/abc',
  'activity path',
);
assert(canonicalCampaignContentPath('EVENT', 'abc') === '/events/abc', 'event path');
assert(
  canonicalCampaignContentPath('EXCURSION', 'abc') === '/excursiones/abc',
  'excursion path not /actividades',
);

assert(isAllowedCampaignCtaUrl('https://yoteinvito.club/descuentos/1'), 'https ok');
assert(isAllowedCampaignCtaUrl('http://localhost:3000/x'), 'localhost http ok');
assert(!isAllowedCampaignCtaUrl('javascript:alert(1)'), 'reject javascript');
assert(!isAllowedCampaignCtaUrl('data:text/html,hi'), 'reject data url');
assert(!isAllowedCampaignCtaUrl('http://evil.example/x'), 'reject plain http remote');

assert(maskEmailHint('jane.doe@example.com') === 'j***@example.com', 'mask email');

const baseCreate = {
  channel: 'EMAIL' as const,
  contentType: 'GASTRO_DISCOUNT' as const,
  contentId: 'cldiscount0001',
  audienceKind: 'ALL_ELIGIBLE' as const,
  subject: 'Novedades',
  headline: 'Esta semana',
  body: 'Mirá este descuento',
};

assert(createAdminCampaignBodySchema.safeParse(baseCreate).success, 'create EMAIL ok');
assert(
  createAdminCampaignBodySchema.safeParse({ ...baseCreate, audienceKind: 'CITY' }).success ===
    false,
  'CITY requires city filter',
);
assert(
  createAdminCampaignBodySchema.safeParse({
    ...baseCreate,
    audienceKind: 'CITY',
    audienceFilter: { city: 'Bariloche' },
  }).success,
  'CITY with city ok',
);

assert(
  isEmailCampaignEligible({
    emailOptIn: true,
    email: 'a@b.com',
    emailVerified: new Date(),
    status: 'ACTIVE',
    role: 'USER',
    userTenantId: 't1',
    campaignTenantId: 't2',
  }).ok === false,
  'audience stays tenant-scoped',
);

console.log('All admin campaign domain tests passed');
