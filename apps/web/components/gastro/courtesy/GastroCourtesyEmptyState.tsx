import Link from 'next/link';
import type { CourtesyEmptyState } from '@/lib/gastro/courtesy-portal';

/** G8.9.10 — Empty states of the courtesy list (0 courtesies / only some lifecycle tabs). */
export function GastroCourtesyEmptyState({
  state,
  createHref,
}: {
  state: CourtesyEmptyState;
  createHref: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border p-6 text-center">
      <p className="font-medium text-text">{state.title}</p>
      {state.description ? (
        <p className="mt-1 text-sm text-text-muted">{state.description}</p>
      ) : null}
      {state.showCreate ? (
        <Link
          href={createHref}
          className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent-hover"
        >
          Crear cortesía
        </Link>
      ) : null}
    </div>
  );
}
