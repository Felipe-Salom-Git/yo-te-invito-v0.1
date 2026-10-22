/**
 * Maps partner catalogs for BenefitSettlement create/filter selectors.
 * Admin gastro list API expects lowercase profile status (`active`), not Prisma `ACTIVE`.
 */

export type SettlementPartnerOption = { id: string; label: string };

export type SettlementPartnerVertical = 'GASTRO' | 'ACTIVITY';

export function adminGastroActiveListQuery(): {
  status: 'active';
  page: number;
  limit: number;
} {
  return { status: 'active', page: 1, limit: 100 };
}

export function mapGastroSettlementPartners(
  rows: Array<{ id: string; displayName: string }> | null | undefined,
): SettlementPartnerOption[] {
  return (rows ?? []).map((p) => ({ id: p.id, label: p.displayName }));
}

export function mapActivitySettlementPartners(
  rows: Array<{ id: string; name: string }> | null | undefined,
): SettlementPartnerOption[] {
  return (rows ?? []).map((p) => ({ id: p.id, label: p.name }));
}

export function resolveSettlementPartnerOptions(
  vertical: SettlementPartnerVertical | '' | string,
  gastroRows: Array<{ id: string; displayName: string }> | null | undefined,
  activityRows: Array<{ id: string; name: string }> | null | undefined,
): SettlementPartnerOption[] {
  if (vertical === 'GASTRO') return mapGastroSettlementPartners(gastroRows);
  if (vertical === 'ACTIVITY') return mapActivitySettlementPartners(activityRows);
  return [];
}
