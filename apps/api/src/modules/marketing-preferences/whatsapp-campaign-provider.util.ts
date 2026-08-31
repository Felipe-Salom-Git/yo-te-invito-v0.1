import { canSendWhatsAppCampaign } from '@yo-te-invito/shared';

/**
 * Env hint for future adapter credentials. Empty / none / disabled / false → not configured.
 * Campaign SEND is never enabled in V3.3 (`canSendWhatsAppCampaign` is always false).
 */
export function isWhatsAppCampaignProviderConfigured(): boolean {
  const raw = (process.env.WHATSAPP_CAMPAIGN_PROVIDER ?? '').trim().toLowerCase();
  return raw.length > 0 && raw !== 'none' && raw !== 'disabled' && raw !== 'false';
}

export { canSendWhatsAppCampaign };
