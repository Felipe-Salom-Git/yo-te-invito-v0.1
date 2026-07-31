import { normalizeLocalityKey } from '@/lib/geo/locality-normalize';

export { normalizeLocalityKey, localityMatchesQuery, filterOptionsByQuery } from '@/lib/geo/locality-normalize';

export function dedupeSelectOptions(
  options: { value: string; label: string }[],
): { value: string; label: string }[] {
  const seen = new Set<string>();
  const out: { value: string; label: string }[] = [];
  for (const option of options) {
    const key = normalizeLocalityKey(option.value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(option);
  }
  return out;
}
