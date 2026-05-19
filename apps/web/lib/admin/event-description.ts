/** Append optional promo line to event description (no separate DB field). */
export function withOptionalPromoLine(
  description: string | null | undefined,
  ofertas: string,
): string | null {
  const base = (description ?? '').trim();
  const promo = ofertas.trim();
  if (!promo) return base || null;
  const block = `\n\n— Ofertas / promoción —\n${promo}`;
  const out = (base + block).trim();
  return out || null;
}

/** Compose description + optional value hint + optional promo (admin alta excursion/rental/evento). */
export function buildAdminEventDescription(
  description: string,
  valueOptional: string,
  ofertas: string,
): string | null {
  const parts = [
    description.trim(),
    valueOptional.trim() ? `— Valor referencia —\n${valueOptional.trim()}` : '',
    ofertas.trim() ? `— Ofertas / promoción —\n${ofertas.trim()}` : '',
  ].filter(Boolean);
  const out = parts.join('\n\n').trim();
  return out || null;
}
