import { z } from 'zod';

/** Prefix estable para escaneo en Slice 5 (scanner/PWA). */
export const GASTRO_DISCOUNT_QR_PREFIX = 'yti:gastro-discount:v1';

const TOKEN_PATTERN = /^[a-f0-9]{16,128}$/i;
const ID_PATTERN = /^[a-z0-9]{10,64}$/i;

export const gastroDiscountQrPayloadV1Schema = z
  .string()
  .min(1)
  .refine(
    (s) => parseGastroDiscountQrPayload(s)?.version === 'v1',
    'Payload QR inválido (se espera yti:gastro-discount:v1:discountId:token)',
  );

export type GastroDiscountQrPayloadV1 = z.infer<typeof gastroDiscountQrPayloadV1Schema>;

export type ParsedGastroDiscountQrV1 = {
  version: 'v1';
  discountId: string;
  token: string;
};

/** Formato histórico con pipes — solo lectura hasta migrar QRs impresos. */
export type ParsedGastroDiscountQrLegacy = {
  version: 'legacy';
  tenantId: string;
  eventId: string;
  discountId: string;
  token: string;
};

export type ParsedGastroDiscountQr = ParsedGastroDiscountQrV1 | ParsedGastroDiscountQrLegacy;

/**
 * Genera el payload QR público. No incluye tenant ni secrets — solo id de descuento + token opaco.
 *
 * - Reclamo de usuario (`GastroDiscountClaim.qrToken`): token por email/QR único.
 * - Referencia del local (`GastroDiscount.qrToken`): token maestro tras aprobación admin.
 */
export function buildGastroDiscountQrPayload(discountId: string, token: string): string {
  const id = discountId.trim();
  const tok = token.trim();
  if (!ID_PATTERN.test(id)) {
    throw new Error('Invalid gastro discount id for QR payload');
  }
  if (!TOKEN_PATTERN.test(tok)) {
    throw new Error('Invalid gastro discount token for QR payload');
  }
  return `${GASTRO_DISCOUNT_QR_PREFIX}:${id}:${tok}`;
}

export function isValidGastroDiscountQrPayload(payload: string): boolean {
  return parseGastroDiscountQrPayload(payload) !== null;
}

/** Ticket door scan payload (`Ticket.qrPayload`). */
export function isTicketQrPayload(raw: string): boolean {
  const t = raw.trim();
  return t.startsWith('yti:v1:') && !t.startsWith(GASTRO_DISCOUNT_QR_PREFIX);
}

export type QrScanFamily = 'ticket' | 'gastro-discount' | 'unknown';

export function classifyQrScanPayload(raw: string): QrScanFamily {
  const trimmed = raw.trim();
  if (!trimmed) return 'unknown';
  if (parseGastroDiscountQrPayload(trimmed)) return 'gastro-discount';
  if (isTicketQrPayload(trimmed)) return 'ticket';
  return 'unknown';
}

/**
 * Parsea payload v1 o legacy (`yti:gastro-discount|tenant|event|discount|token`).
 * Slice 5: validar primero claim por (discountId, token), luego descuento maestro.
 */
export function parseGastroDiscountQrPayload(raw: string): ParsedGastroDiscountQr | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith(`${GASTRO_DISCOUNT_QR_PREFIX}:`)) {
    const rest = trimmed.slice(GASTRO_DISCOUNT_QR_PREFIX.length + 1);
    const colon = rest.indexOf(':');
    if (colon <= 0) return null;
    const discountId = rest.slice(0, colon);
    const token = rest.slice(colon + 1);
    if (!ID_PATTERN.test(discountId) || !TOKEN_PATTERN.test(token)) return null;
    return { version: 'v1', discountId, token };
  }

  if (trimmed.startsWith('yti:gastro-discount|')) {
    const parts = trimmed.split('|');
    if (parts.length === 5) {
      const [, tenantId, eventId, discountId, token] = parts;
      if (
        tenantId &&
        eventId &&
        ID_PATTERN.test(discountId) &&
        TOKEN_PATTERN.test(token)
      ) {
        return { version: 'legacy', tenantId, eventId, discountId, token };
      }
    }
    if (parts.length === 4) {
      const [, eventId, discountId, token] = parts;
      if (eventId && ID_PATTERN.test(discountId) && TOKEN_PATTERN.test(token)) {
        return {
          version: 'legacy',
          tenantId: '',
          eventId,
          discountId,
          token,
        };
      }
    }
  }

  return null;
}
