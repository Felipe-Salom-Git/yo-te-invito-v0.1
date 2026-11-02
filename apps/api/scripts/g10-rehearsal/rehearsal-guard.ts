/**
 * G10.E3 — release rehearsal guard: these scripts only ever run against a scratch database
 * whose name contains "rehearsal" (never the dev DB, never production).
 */
export const REHEARSAL_TENANT_NAME = 'G10 release rehearsal';

export function assertRehearsalDatabase(): string {
  const url = process.env.DATABASE_URL ?? '';
  const dbName = url.split('?')[0]?.split('/').pop() ?? '';
  if (!/rehearsal/i.test(dbName)) {
    throw new Error(`Refusing to run: DATABASE_URL database "${dbName}" is not a rehearsal database`);
  }
  return dbName;
}

export function argValue(flag: string): string | undefined {
  const argv = process.argv.slice(2);
  const idx = argv.indexOf(flag);
  return idx >= 0 ? argv[idx + 1] : undefined;
}

export const jsonReplacer = (_k: string, v: unknown) =>
  typeof v === 'bigint' ? v.toString() : v;
