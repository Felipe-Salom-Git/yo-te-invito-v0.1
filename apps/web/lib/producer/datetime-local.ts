/** Map API ISO string to value for `<input type="datetime-local" />`. */
export function isoToDatetimeLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Parse datetime-local value to ISO for API. */
export function localInputToIso(local: string): string {
  return new Date(local).toISOString();
}
