/** Digits only for wa.me (preserves country code, strips spaces/symbols). */
export function rentalWhatsAppDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Builds a WhatsApp deep link for a rental product, or null if the local has no number.
 * No global fallback — callers must handle null (hide CTA).
 */
export function buildRentalWhatsAppHref(
  whatsappPhone: string | null | undefined,
  productTitle: string,
): string | null {
  const raw = whatsappPhone?.trim();
  if (!raw) return null;
  const digits = rentalWhatsAppDigits(raw);
  if (!digits) return null;
  const text = encodeURIComponent(
    `Hola, quiero consultar disponibilidad de ${productTitle} en Yo Te Invito.`,
  );
  return `https://wa.me/${digits}?text=${text}`;
}
