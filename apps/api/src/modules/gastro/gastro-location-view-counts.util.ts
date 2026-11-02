/**
 * G12.1-D — Per-local page-view totals for the portal locations list.
 * Source = `GastroProfileView` rows (same as the dashboard `totalViews`), grouped by local.
 * G12.1-D — Total de visualizaciones por local; nunca se suma a nivel cuenta.
 */

export type GastroProfileViewGroupRow = { gastroProfileId: string; _count: { _all: number } };

export function mapViewCountsByProfile(
  profileIds: string[],
  groups: GastroProfileViewGroupRow[],
): Map<string, number> {
  const counts = new Map<string, number>(profileIds.map((id) => [id, 0]));
  for (const g of groups) {
    if (counts.has(g.gastroProfileId)) counts.set(g.gastroProfileId, g._count._all);
  }
  return counts;
}
