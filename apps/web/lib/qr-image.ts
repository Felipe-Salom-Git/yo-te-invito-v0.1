/** External QR image (same provider as ticket QR in cuenta). */
export function qrImageUrl(data: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

/** Payload for door scanner / manual entry (v1). */
export function gastroDiscountQrPayload(
  eventId: string,
  discountId: string,
  codeOrToken: string,
  tenantId?: string,
): string {
  if (tenantId) {
    return `yti:gastro-discount|${tenantId}|${eventId}|${discountId}|${codeOrToken}`;
  }
  return `yti:gastro-discount|${eventId}|${discountId}|${codeOrToken}`;
}
