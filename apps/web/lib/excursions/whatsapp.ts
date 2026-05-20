const DEFAULT_WHATSAPP = '5491112345678';

export function buildExcursionWhatsAppHref(
  contactPhone: string | null | undefined,
  productTitle: string,
): string {
  const digits = (contactPhone?.trim() || DEFAULT_WHATSAPP).replace(/\D/g, '');
  const text = encodeURIComponent(`Hola, me interesa ${productTitle}`);
  return `https://wa.me/${digits}?text=${text}`;
}
