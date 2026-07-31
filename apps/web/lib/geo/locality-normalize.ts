/** Normalize locality labels for dedupe / search (accents, case, spaces). */
export function normalizeLocalityKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('es-AR')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ');
}

export function localityMatchesQuery(label: string, query: string): boolean {
  const q = normalizeLocalityKey(query);
  if (!q) return true;
  return normalizeLocalityKey(label).includes(q);
}

export function filterOptionsByQuery<T extends { value: string; label: string }>(
  options: T[],
  query: string,
): T[] {
  const q = normalizeLocalityKey(query);
  if (!q) return options;
  return options.filter((o) => localityMatchesQuery(o.label, q) || localityMatchesQuery(o.value, q));
}
