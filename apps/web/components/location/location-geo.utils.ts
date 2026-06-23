/** Normalize locality label for dedupe (frontend defense). */
export function normalizeLocalityKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('es-AR')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ');
}

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
