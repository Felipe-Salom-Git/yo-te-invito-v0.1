import type { MeLegalRequirementItem } from '@/repositories/interfaces';

export function allLegalItemsSelected(
  items: MeLegalRequirementItem[],
  selectedVersionIds: string[],
): boolean {
  if (items.length === 0) return true;
  return items.every((i) => selectedVersionIds.includes(i.documentVersionId));
}

export const LEGAL_ACCEPTANCE_REQUIRED_MSG =
  'Para continuar, aceptá los términos vigentes.';
