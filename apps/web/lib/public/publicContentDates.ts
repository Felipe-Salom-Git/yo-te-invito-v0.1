/**
 * Public date display rules — V3.1 Etapa 2.
 * Only ticketing events show `startAt` as a public activity date.
 */

export function shouldShowPublicEventDate(category?: string | null): boolean {
  return category === 'event' || category == null;
}

/** Format event `startAt` for public UI (never `createdAt`). */
export function formatPublicEventDate(startAt?: string | null): string | null {
  if (!startAt) return null;
  return new Date(startAt).toLocaleDateString('es-AR');
}
