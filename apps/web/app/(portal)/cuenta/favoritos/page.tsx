'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle } from '@/components';
import { getContentDetailHref, getCategoryLabel } from '@/lib/home/contentRoutes';

const TENANT = 'tenant-demo';

export default function FavoritosPage() {
  const { data: session, status } = useSession();
  const repos = useRepositories();
  const userId =
    (session?.user as { userId?: string })?.userId ??
    (session?.user as { id?: string })?.id ??
    '';

  const { data: prefs } = useQuery({
    queryKey: ['userPreferences', userId],
    queryFn: () => repos.users.getPreferences(userId),
    enabled: !!userId,
  });

  const ids = prefs?.favoriteEventIds ?? [];

  const { data: events, isLoading } = useQuery({
    queryKey: ['cuenta', 'favoritos', ids.join('|')],
    queryFn: async () => {
      const capped = ids.slice(0, 50);
      const rows = await Promise.all(capped.map((id) => repos.events.getDetail(id, TENANT)));
      return rows.filter((e): e is NonNullable<typeof e> => !!e);
    },
    enabled: !!userId && ids.length > 0,
  });

  if (status === 'loading') {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }
  if (!session?.user) {
    return (
      <PageContainer>
        <p className="text-text-muted">Iniciá sesión para ver favoritos.</p>
        <Link href="/login" className="mt-4 block text-accent">
          Iniciar sesión
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link href="/cuenta" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Cuenta
      </Link>
      <SectionTitle>Favoritos</SectionTitle>
      <p className="mt-2 text-text-muted">Eventos y lugares que marcaste con ★.</p>

      {ids.length === 0 ? (
        <p className="mt-6 text-text-muted">Todavía no guardaste favoritos.</p>
      ) : isLoading ? (
        <p className="mt-6 text-text-muted">Cargando…</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {(events ?? []).map((ev) => (
            <li key={ev.id}>
              <Link
                href={getContentDetailHref(ev)}
                className="block rounded-lg border border-border bg-bg-muted p-4 hover:border-accent"
              >
                <p className="font-medium text-text">{ev.title}</p>
                <p className="text-xs text-text-muted">{getCategoryLabel(ev.category)}</p>
                <p className="text-sm text-text-muted">
                  {ev.city ?? ev.venueName ?? '—'} ·{' '}
                  {ev.startAt ? new Date(ev.startAt).toLocaleDateString('es-AR') : '—'}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
