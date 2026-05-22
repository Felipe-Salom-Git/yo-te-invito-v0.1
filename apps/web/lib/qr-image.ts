import { buildGastroDiscountQrPayload, GASTRO_DISCOUNT_QR_PREFIX } from '@yo-te-invito/shared';

/** External QR image (same provider as ticket QR in cuenta). */
export function qrImageUrl(data: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

/** @deprecated Use buildGastroDiscountQrPayload from @yo-te-invito/shared */
export function gastroDiscountQrPayload(
  eventId: string,
  discountId: string,
  codeOrToken: string,
  tenantId?: string,
): string {
  void eventId;
  void tenantId;
  return buildGastroDiscountQrPayload(discountId, codeOrToken);
}

export { GASTRO_DISCOUNT_QR_PREFIX, buildGastroDiscountQrPayload };
