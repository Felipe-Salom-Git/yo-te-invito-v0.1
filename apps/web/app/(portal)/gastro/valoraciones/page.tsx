'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle } from '@/components';

const TENANT_ID = 'tenant-demo';

export default function GastroValoracionesPage() {
  const repos = useRepositories();
  const [selectedEventId, setSelectedEventId] = useState('');

  const { data: eventsData } = useQuery({
    queryKey: ['events', 'gastro', TENANT_ID],
    queryFn: () => repos.events.list({ tenantId: TENANT_ID, category: 'gastro', limit: 50 }),
  });

  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ['reviews', selectedEventId],
    queryFn: () => repos.reviews.list(selectedEventId, TENANT_ID, 1, 50),
    enabled: !!selectedEventId,
  });

  const events = eventsData?.data ?? [];
  const reviews = reviewsData?.reviews ?? [];
  const currentEventId = selectedEventId || events[0]?.id;
  useEffect(() => {
    if (!selectedEventId && events[0]) setSelectedEventId(events[0].id);
  }, [events, selectedEventId]);

  if (events.length === 0) {
    return (
      <PageContainer>
        <Link href="/gastro" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
          ← Dashboard
        </Link>
        <SectionTitle>Valoraciones</SectionTitle>
        <p className="mt-4 text-text-muted">No hay eventos gastro para ver valoraciones.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link href="/gastro" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Dashboard
      </Link>
      <SectionTitle>Valoraciones de clientes</SectionTitle>
      <p className="mt-2 text-text-muted">Opiniones y puntajes de tus clientes.</p>

      <div className="mt-6">
        <label className="block text-sm font-medium text-text">Evento / Establecimiento</label>
        <select
          value={currentEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="mt-1 rounded border border-border bg-bg px-3 py-2 text-text"
        >
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="mt-6 text-text-muted">Cargando…</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-lg border border-border bg-bg-muted p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-text">{r.userName}</span>
                <span className="rounded bg-accent/20 px-2 py-0.5 text-sm text-accent">
                  {r.score} / 5
                </span>
              </div>
              {r.title && <p className="mt-1 font-medium text-text">{r.title}</p>}
              {r.comment && <p className="mt-1 text-sm text-text-muted">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}

      {reviews.length === 0 && !isLoading && (
        <p className="mt-6 text-text-muted">Aún no hay valoraciones para este establecimiento.</p>
      )}
    </PageContainer>
  );
}
