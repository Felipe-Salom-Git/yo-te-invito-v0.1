'use client';

import Link from 'next/link';
import { EventSectionCard } from './EventSectionCard';
import { getProducerPublicPath } from '@/lib/producer/public-path';

type ProducerContact = {
  id: string;
  slug: string | null;
  displayName: string;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  whatsapp?: string | null;
};

type Props = {
  producer?: ProducerContact | null;
};

export function EventPublicityInfoCard({ producer }: Props) {
  const phone = producer?.whatsapp?.trim() || producer?.primaryPhone?.trim();
  const email = producer?.primaryEmail?.trim();

  return (
    <EventSectionCard title="Evento informativo" id="comprar">
      <p className="text-sm text-text-muted leading-relaxed">
        Este evento fue publicado solo como difusión. No tiene venta de entradas desde Yo Te
        Invito.
      </p>
      {producer ? (
        <p className="mt-3 text-sm text-text-muted">
          Podés ver más información en el perfil de la productora.
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {producer ? (
          <Link
            href={getProducerPublicPath(producer)}
            className="inline-flex rounded-full border border-accent-muted bg-accent-surface/80 px-4 py-2 text-sm font-medium text-accent-soft hover:bg-accent-surface"
          >
            Ver perfil de la productora
          </Link>
        ) : null}
        {email ? (
          <a
            href={`mailto:${email}`}
            className="inline-flex rounded-full border border-border px-4 py-2 text-sm text-text hover:border-accent"
          >
            Contactar productora
          </a>
        ) : null}
        {!email && phone ? (
          <a
            href={`tel:${phone.replace(/\s/g, '')}`}
            className="inline-flex rounded-full border border-border px-4 py-2 text-sm text-text hover:border-accent"
          >
            Contactar productora
          </a>
        ) : null}
      </div>
    </EventSectionCard>
  );
}
