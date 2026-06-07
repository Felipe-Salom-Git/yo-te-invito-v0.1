import { z } from 'zod';

export const eventSubcategoryPublicSchema = z.object({
  id: z.string(),
  name: z.string(),
  isPrimary: z.boolean().optional(),
});
export type EventSubcategoryPublic = z.infer<typeof eventSubcategoryPublicSchema>;

/** Excursion multi-select input — deduped, max 8. */
export const excursionSubcategoryIdsInputSchema = z
  .array(z.string().min(1))
  .max(8)
  .optional()
  .nullable();

export function dedupeSubcategoryIds(ids: string[] | null | undefined): string[] {
  if (!ids?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const t = id.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/**
 * Resolves primary + full list from legacy `subcategoryId` and/or `subcategoryIds`.
 * Primary: explicit `subcategoryId` if in list; else first selected.
 */
export function resolveExcursionSubcategorySelection(input: {
  subcategoryId?: string | null;
  subcategoryIds?: string[] | null;
}): { primaryId: string | null; allIds: string[] } | null {
  const hasIds = input.subcategoryIds !== undefined;
  const hasSingle = input.subcategoryId !== undefined;
  if (!hasIds && !hasSingle) return null;

  let allIds = hasIds ? dedupeSubcategoryIds(input.subcategoryIds) : [];
  if (!hasIds && hasSingle) {
    const single = input.subcategoryId?.trim();
    allIds = single ? [single] : [];
  } else if (hasSingle && input.subcategoryId?.trim()) {
    const single = input.subcategoryId.trim();
    if (!allIds.includes(single)) {
      allIds = [single, ...allIds];
    }
  }

  if (allIds.length === 0) {
    return { primaryId: null, allIds: [] };
  }

  const explicitPrimary = input.subcategoryId?.trim();
  const primaryId =
    explicitPrimary && allIds.includes(explicitPrimary) ? explicitPrimary : allIds[0]!;

  const ordered = [primaryId, ...allIds.filter((id) => id !== primaryId)];
  return { primaryId, allIds: ordered };
}
