'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle } from '@/components';
import { getContentDetailHref } from '@/lib/home/contentRoutes';

const TENANT = 'tenant-demo';

export default function EventosEsperadosPage() {
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

  const { data: tickets = [] } = useQuery({
    queryKey: ['tickets', 'me', userId],
    queryFn: () => repos.users.getMyTickets(userId),
    enabled: !!userId,
  });

  const fromTickets = [...new Set(tickets.filter((t) => t.status === 'VALID').map((t) => t.eventId))];
  const fromPrefs = prefs?.expectedEventIds ?? [];
  const mergedIds = [...new Set([...fromPrefs, ...fromTickets])];

  const { data: events, isLoading } = useQuery({
    queryKey: ['cuenta', 'eventos-esperados', mergedIds.join('|')],
    queryFn: async () => {
      const results = await Promise.all(
        mergedIds.map((id) => repos.events.getDetail(id, TENANT)),
      );
      return results.filter((e): e is NonNullable<typeof e> => !!e);
    },
    enabled: mergedIds.length > 0,
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
        <p className="text-text-muted">Iniciá sesión para ver tus eventos esperados.</p>
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
      <SectionTitle>Eventos esperados</SectionTitle>
      <p className="mt-2 text-text-muted">
        Combinamos lo que marcaste como <span className="text-text">“Lo espero”</span> con eventos donde tenés tickets
        vigentes.
      </p>

      {mergedIds.length === 0 ? (
        <p className="mt-6 text-text-muted">
          No tenés eventos esperados. Marcá “Lo espero” en una ficha o comprá entradas.
        </p>
      ) : isLoading ? (
        <p className="mt-6 text-text-muted">Cargando…</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {(events ?? []).map((ev) => {
            const fromList = fromPrefs.includes(ev.id);
            const hasTicket = fromTickets.includes(ev.id);
            return (
              <li key={ev.id}>
                <Link
                  href={getContentDetailHref(ev)}
                  className="block rounded-lg border border-border bg-bg-muted p-4 hover:border-accent"
                >
                  <p className="font-medium text-text">{ev.title}</p>
                  <p className="text-sm text-text-muted">
                    {ev.city ?? ev.venueName ?? '—'} ·{' '}
                    {ev.startAt ? new Date(ev.startAt).toLocaleDateString('es-AR') : '—'}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {fromList && hasTicket
                      ? 'En tu lista y con ticket'
                      : fromList
                        ? 'En tu lista “Lo espero”'
                        : 'Con ticket vigente'}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <Link href="/me/tickets" className="mt-6 block text-accent hover:underline">
        Ver mis tickets →
      </Link>
    </PageContainer>
  );
}
