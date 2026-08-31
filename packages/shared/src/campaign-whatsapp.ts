/** V3.3: no WhatsApp BSP/Cloud API adapter. Env alone must not enable send. */

export const WHATSAPP_CAMPAIGN_PROVIDER_STATUS = 'NOT_CONFIGURED' as const;

export function canSendWhatsAppCampaign(): false {
  return false;
}

export function getWhatsAppCampaignChannelStatus() {
  return {
    channel: 'WHATSAPP' as const,
    status: WHATSAPP_CAMPAIGN_PROVIDER_STATUS,
    sendEnabled: false as const,
    reason: 'PROVIDER_NOT_CONFIGURED' as const,
  };
}
