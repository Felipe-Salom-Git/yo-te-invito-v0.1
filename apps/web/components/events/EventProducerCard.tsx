'use client';

import Link from 'next/link';
import { EventSectionCard } from '@/components/events/detail/EventSectionCard';
import { getProducerPublicPath } from '@/lib/producer/public-path';

export type EventProducerCardData = {
  id: string;
  slug: string | null;
  displayName: string;
  logoUrl?: string | null;
  shortDescription?: string | null;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  whatsapp?: string | null;
};

type Props = {
  producer: EventProducerCardData;
};

export function EventProducerCard({ producer }: Props) {
  if (!producer.displayName?.trim()) return null;

  const phone = producer.whatsapp?.trim() || producer.primaryPhone?.trim();
  const email = producer.primaryEmail?.trim();

  return (
    <EventSectionCard>
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
        Publicado por
      </p>
      <div className="mt-3 flex items-start gap-4">
        {producer.logoUrl?.trim() ? (
          <img
            src={producer.logoUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border bg-bg text-lg font-semibold text-accent">
            {producer.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-text">{producer.displayName}</p>
          {producer.shortDescription ? (
            <p className="mt-1 text-sm text-text-muted line-clamp-2">
              {producer.shortDescription}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={getProducerPublicPath(producer)}
              className="text-sm font-medium text-accent hover:underline"
            >
              Ver perfil de la productora
            </Link>
            {email ? (
              <a
                href={`mailto:${email}`}
                className="text-sm text-text-muted hover:text-accent"
              >
                Email
              </a>
            ) : null}
            {phone ? (
              <a
                href={`tel:${phone.replace(/\s/g, '')}`}
                className="text-sm text-text-muted hover:text-accent"
              >
                Teléfono
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </EventSectionCard>
  );
}
