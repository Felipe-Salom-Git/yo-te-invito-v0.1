/**
 * WhatsApp blast is not configured until a real provider is chosen (Etapa 8.5).
 * Empty / none / disabled / false → NOT_CONFIGURED.
 */
export function isWhatsAppCampaignProviderConfigured(): boolean {
  const raw = (process.env.WHATSAPP_CAMPAIGN_PROVIDER ?? '').trim().toLowerCase();
  return raw.length > 0 && raw !== 'none' && raw !== 'disabled' && raw !== 'false';
}
