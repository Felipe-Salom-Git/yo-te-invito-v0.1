/**
 * G12.1-D — Label for the per-local view metric in the portal locations list.
 * G12.1-D — Etiqueta de visualizaciones por local en el listado del portal.
 */
export function formatGastroLocationViews(viewCount: number | null | undefined): string {
  const n = Math.max(0, Math.trunc(viewCount ?? 0));
  const formatted = n.toLocaleString('es-AR');
  return `${formatted} ${n === 1 ? 'visualización' : 'visualizaciones'}`;
}
