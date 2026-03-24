'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { PageContainer, SectionTitle } from '@/components';

const TENANT_ID = 'tenant-demo';

export default function ProducerProfilePage() {
  const params = useParams();
  const id = (params?.id as string) ?? '';
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_ID;

  const { data: producer, isLoading, error } = useQuery({
    queryKey: ['producer', id],
    queryFn: () => repos.producers.get(id),
    enabled: !!id,
  });

  const events = producer?.events ?? [];

  if (isLoading || !id) {
    return (
      <PageContainer>
        <p className="text-text-muted">Loading…</p>
      </PageContainer>
    );
  }

  if (error || !producer) {
    return (
      <PageContainer>
        <p className="text-red-400">Producer not found</p>
        <Link href="/home" className="mt-4 block text-accent hover:underline">
          ← Back
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link href="/home" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Back
      </Link>
      <SectionTitle>{producer.displayName}</SectionTitle>
      {producer.shortDescription && <p className="mt-2 text-text-muted">{producer.shortDescription}</p>}
      {producer.longDescription && <p className="mt-4 text-sm text-text max-w-2xl whitespace-pre-wrap">{producer.longDescription}</p>}
      {(producer.ratingAvg != null || producer.ratingCount) && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          {producer.ratingAvg != null && (
            <span className="font-medium text-amber-400">★ {producer.ratingAvg.toFixed(1)}</span>
          )}
          {producer.ratingCount != null && producer.ratingCount > 0 && (
            <span className="text-text-muted">({producer.ratingCount} reviews)</span>
          )}
        </div>
      )}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-text">Eventos</h2>
        {events.length === 0 ? (
          <p className="mt-4 text-text-muted">No hay eventos</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {events.map((ev) => (
              <li key={ev.id}>
                <Link
                  href={`/events/${ev.id}?tenantId=${TENANT_ID}`}
                  className="block rounded-lg border border-border bg-bg-muted p-4 hover:border-accent"
                >
                  <h3 className="font-semibold text-text">{ev.title}</h3>
                  <p className="mt-1 text-sm text-text-muted">
                    {ev.city ?? ev.venueName ?? '—'} · {new Date(ev.startAt).toLocaleDateString('es-AR')}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageContainer>
  );
}
