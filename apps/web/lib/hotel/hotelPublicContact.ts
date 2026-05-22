/** WhatsApp / teléfono — solo datos reales, sin número demo. */

export function buildHotelWhatsAppHref(
  displayName: string,
  whatsappPhone?: string | null,
  contactPhone?: string | null,
): string | null {
  const raw = whatsappPhone?.trim() || contactPhone?.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 8) return null;
  const text = encodeURIComponent(`Hola, quiero consultar por ${displayName}`);
  return `https://wa.me/${digits}?text=${text}`;
}

export function buildHotelTelHref(phone?: string | null): string | null {
  const raw = phone?.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 8) return null;
  return `tel:+${digits}`;
}
