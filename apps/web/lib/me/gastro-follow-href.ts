/** URL pública de ficha de local gastronómico. */
export function gastroLocationPublicHref(
  gastroProfileId: string,
  tenantId?: string,
): string {
  const base = `/restaurants/${gastroProfileId}`;
  return tenantId ? `${base}?tenantId=${encodeURIComponent(tenantId)}` : base;
}
