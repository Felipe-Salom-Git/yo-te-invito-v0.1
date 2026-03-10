'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle } from '@/components';

export default function EventosAsistidosPage() {
  const { data: session, status } = useSession();
  const repos = useRepositories();
  const userId = (session?.user as { userId?: string })?.userId ?? (session?.user as { id?: string })?.id ?? '';

  const { data: tickets = [] } = useQuery({
    queryKey: ['tickets', 'me', userId],
    queryFn: () => repos.users.getMyTickets(userId),
    enabled: !!userId,
  });

  const attendedEventIds = [...new Set(tickets.filter((t) => t.status === 'USED').map((t) => t.eventId))];

  const { data: events } = useQuery({
    queryKey: ['events', 'detail', attendedEventIds],
    queryFn: async () => {
      const results = await Promise.all(
        attendedEventIds.map((id) => repos.events.getDetail(id, 'tenant-demo'))
      );
      return results.filter(Boolean);
    },
    enabled: attendedEventIds.length > 0,
  });

  if (status === 'loading') return <PageContainer><p className="text-text-muted">Cargando…</p></PageContainer>;
  if (!session?.user) {
    return (
      <PageContainer>
        <p className="text-text-muted">Iniciá sesión para ver tus eventos asistidos.</p>
        <Link href="/login" className="mt-4 block text-accent">Iniciar sesión</Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link href="/cuenta" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Cuenta
      </Link>
      <SectionTitle>Eventos asistidos</SectionTitle>
      <p className="mt-2 text-text-muted">Eventos a los que ya asististe (tickets usados).</p>

      {attendedEventIds.length === 0 ? (
        <p className="mt-6 text-text-muted">Aún no tenés eventos asistidos.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {(events ?? []).map((ev) =>
            ev ? (
              <li key={ev.id}>
                <Link
                  href={`/events/${ev.id}`}
                  className="block rounded-lg border border-border bg-bg-muted p-4 hover:border-accent"
                >
                  <p className="font-medium text-text">{ev.title}</p>
                  <p className="text-sm text-text-muted">
                    {ev.city ?? ev.venueName ?? '—'} · {ev.startAt ? new Date(ev.startAt).toLocaleDateString() : '—'}
                  </p>
                </Link>
              </li>
            ) : null
          )}
        </ul>
      )}
    </PageContainer>
  );
}
