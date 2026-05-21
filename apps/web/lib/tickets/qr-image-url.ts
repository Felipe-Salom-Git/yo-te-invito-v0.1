import { MIN_QR_DISPLAY_PX } from '@/lib/tickets/qr-display';

/**
 * QR image URL for display only. Payload must match DB `Ticket.qrPayload` (scanner lookup).
 * Format issued at checkout: `yti:v1:<hex>` — do not transform.
 */
const QR_API = 'https://api.qrserver.com/v1/create-qr-code/';

export function buildTicketQrImageUrl(qrPayload: string, pixelSize = 320): string {
  const size = Math.min(Math.max(pixelSize, MIN_QR_DISPLAY_PX), 512);
  return `${QR_API}?size=${size}x${size}&margin=14&ecc=M&data=${encodeURIComponent(qrPayload)}`;
}
