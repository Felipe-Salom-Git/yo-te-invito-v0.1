'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { PageContainer } from '@/components';

export default function PublicReferrersListPage() {
  const repos = useRepositories();
  const { tenantId } = useTenant();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public', 'referrers', tenantId, 1],
    queryFn: () => repos.profiles.listPublicReferrers(tenantId, 1, 48),
  });

  const referrers = data?.referrers ?? [];

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-bg to-bg-muted/20">
      <PageContainer className="max-w-5xl py-10">
        <p className="text-xs font-medium uppercase tracking-widest text-accent">Directorio</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">Referidores</h1>
        <p className="mt-3 max-w-2xl text-text-muted">
          Perfiles públicos. Para asociar tu productora necesitás el link personal que cada referidor comparte (no es un
          link /r/ de venta).
        </p>

        {isLoading && <p className="mt-10 text-text-muted">Cargando…</p>}
        {isError && <p className="mt-10 text-red-400">No se pudo cargar el listado.</p>}

        {!isLoading && !isError && referrers.length === 0 && (
          <p className="mt-10 rounded-xl border border-dashed border-border px-6 py-10 text-center text-text-muted">
            No hay referidores públicos.
          </p>
        )}

        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {referrers.map((r) => (
            <li
              key={r.id}
              className="flex gap-4 rounded-2xl border border-border bg-bg-muted/40 p-4 transition hover:border-accent/40"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-bg text-lg font-semibold text-accent">
                {r.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  r.displayName.slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-semibold text-text">{r.displayName}</h2>
                {r.bio && <p className="mt-1 line-clamp-2 text-sm text-text-muted">{r.bio}</p>}
                <p className="mt-2 text-xs text-text-muted">
                  Score {r.salesScore ?? '—'} · {r.completedSales} ventas ·{' '}
                  {[r.city, r.region].filter(Boolean).join(', ') || '—'}
                </p>
                <div className="mt-3">
                  {r.slug ? (
                    <Link
                      href={`/referrers/${encodeURIComponent(r.slug)}`}
                      className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-bg hover:bg-accent-hover"
                    >
                      Ver perfil
                    </Link>
                  ) : (
                    <span className="text-xs text-text-muted">Sin slug público</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </PageContainer>
    </div>
  );
}
