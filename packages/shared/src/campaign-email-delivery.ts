import { isEmailCampaignEligible } from './schemas/marketing-preferences';

export type CampaignEmailDeliveryDecision =
  | { action: 'send' }
  | { action: 'skip'; reason: string }
  | { action: 'already_sent' };

export function evaluateCampaignEmailDelivery(input: {
  deliveryStatus: string;
  cancelRequested: boolean;
  emailOptIn: boolean | null | undefined;
  email: string | null | undefined;
  emailVerified: Date | string | null | undefined;
  status: string | null | undefined;
  role: string | null | undefined;
  userTenantId: string | null | undefined;
  campaignTenantId: string;
  userGone: boolean;
  contentEligible?: boolean;
  channel?: string;
}): CampaignEmailDeliveryDecision {
  if (input.deliveryStatus === 'SENT') return { action: 'already_sent' };
  if (input.deliveryStatus === 'SKIPPED') return { action: 'skip', reason: 'ALREADY_SKIPPED' };
  if (input.channel === 'WHATSAPP') {
    return { action: 'skip', reason: 'WHATSAPP_PROVIDER_NOT_CONFIGURED' };
  }
  if (input.cancelRequested) return { action: 'skip', reason: 'CANCELLED_BY_ADMIN' };
  if (input.userGone) return { action: 'skip', reason: 'USER_GONE' };
  if (input.contentEligible === false) {
    return { action: 'skip', reason: 'CONTENT_NOT_ELIGIBLE' };
  }
  const eligible = isEmailCampaignEligible({
    emailOptIn: input.emailOptIn,
    email: input.email,
    emailVerified: input.emailVerified,
    status: input.status,
    role: input.role,
    userTenantId: input.userTenantId,
    campaignTenantId: input.campaignTenantId,
  });
  if (!eligible.ok) {
    return { action: 'skip', reason: eligible.reason };
  }
  return { action: 'send' };
}

export function isCampaignProviderErrorRetryable(
  errorCode: string | undefined,
  retryableFlag?: boolean,
): boolean {
  if (retryableFlag === false) return false;
  if (!errorCode) return true;
  const permanent = new Set([
    'SMTP_NOT_CONFIGURED',
    'SMTP_REJECTED',
    'INVALID_RECIPIENT',
    'UNSUBSCRIBED',
    'MISSING_RECIPIENT',
  ]);
  return !permanent.has(errorCode);
}

export function sanitizeCampaignErrorCode(raw: string | undefined): string {
  const trimmed = (raw ?? 'SEND_FAILED').replace(/\s+/g, '_').slice(0, 80);
  if (/password|secret|token|apikey|authorization/i.test(trimmed)) {
    return 'PROVIDER_ERROR';
  }
  return trimmed || 'SEND_FAILED';
}
