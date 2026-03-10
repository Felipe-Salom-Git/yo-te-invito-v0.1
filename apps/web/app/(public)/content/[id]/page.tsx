'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle } from '@/components';

const TENANT_ID = 'tenant-demo';

/** Content detail for gastro/excursion/rental — uses event data as content. */
export default function ContentDetailPage() {
  const params = useParams();
  const id = (params?.id as string) ?? '';
  const repos = useRepositories();

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', id, TENANT_ID],
    queryFn: () => repos.events.getDetail(id, TENANT_ID),
    enabled: !!id,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['reviews', id, TENANT_ID],
    queryFn: () => repos.reviews.list(id, TENANT_ID, 1, 10),
    enabled: !!id,
  });

  const reviews = reviewsData?.reviews ?? [];

  if (isLoading || !id) {
    return (
      <PageContainer>
        <p className="text-text-muted">Loading…</p>
      </PageContainer>
    );
  }

  if (error || !event) {
    return (
      <PageContainer>
        <p className="text-red-400">Content not found</p>
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
      <SectionTitle>{event.title}</SectionTitle>
      <p className="mt-2 text-text-muted">
        {event.venueName && <span>{event.venueName}</span>}
        {event.city && <span> · {event.city}</span>}
        <span> · {new Date(event.startAt).toLocaleDateString('es-AR')}</span>
      </p>
      {event.description && <p className="mt-4 text-text">{event.description}</p>}
      {event.media && event.media.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {event.media.map((m) => (
            <div key={m.id} className="aspect-video rounded-lg bg-border">
              {m.type === 'image' ? (
                <img src={m.url} alt="" className="h-full w-full rounded-lg object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-text-muted">Video</div>
              )}
            </div>
          ))}
        </div>
      )}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-text">Reviews</h2>
        {reviews.length === 0 ? (
          <p className="mt-4 text-text-muted">No reviews yet</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-lg border border-border bg-bg-muted p-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-amber-400">★ {r.score}</span>
                  <span className="text-sm text-text-muted">{r.userName}</span>
                  <span className="text-xs text-text-muted/70">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {r.title && <p className="mt-1 font-medium">{r.title}</p>}
                {r.comment && <p className="mt-1 text-text-muted">{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageContainer>
  );
}
