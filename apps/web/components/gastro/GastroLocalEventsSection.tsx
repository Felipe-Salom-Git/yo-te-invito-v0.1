'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { publicGastroKeys } from '@/lib/query/keys';
import { toGastroLocalEventCards } from '@/lib/gastro/gastroPromoEvents';

type Props = {
  locationId: string;
  tenantId: string;
};

const MAX_EVENTS = 12;

/** G12.2-D — «Eventos» block of the gastro ficha: published promo events of this local. */
export function GastroLocalEventsSection({ locationId, tenantId }: Props) {
  const repos = useRepositories();
  const { data } = useQuery({
    queryKey: publicGastroKeys.promoEvents(locationId, tenantId),
    queryFn: () =>
      repos.events.list({
        tenantId,
        category: 'event',
        gastroProfileId: locationId,
        sort: 'dateAsc',
        page: 1,
        limit: MAX_EVENTS,
      }),
    enabled: !!locationId,
  });

  const cards = toGastroLocalEventCards(locationId, data?.data ?? []);
  if (cards.length === 0) return null;

  return (
    <section
      id="gastro-events"
      className="scroll-mt-24 rounded-xl border border-border bg-bg-muted/40 p-5"
      aria-label="Eventos"
    >
      <h2 className="text-lg font-semibold text-text">Eventos</h2>
      <p className="mt-1 text-sm text-text-muted">Próximas actividades organizadas por el local.</p>
      <ul className="mt-4 space-y-4">
        {cards.map((c) => (
          <li key={c.id} className="overflow-hidden rounded-xl border border-border bg-bg-muted/90">
            <Link
              href={c.href}
              className="flex flex-col gap-3 p-4 transition-colors hover:bg-white/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:flex-row sm:items-stretch"
            >
              {c.imageUrl ? (
                <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-lg border border-border sm:h-auto sm:w-40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.imageUrl} alt={c.title} className="h-full w-full object-cover" />
                </div>
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-text">{c.title}</p>
                <p className="mt-1 text-sm font-medium capitalize text-accent">
                  {c.date} · {c.time}
                </p>
                {c.excerpt ? <p className="mt-2 text-sm text-text-muted">{c.excerpt}</p> : null}
                <span className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-lg border border-accent/50 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent">
                  Ver evento
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
