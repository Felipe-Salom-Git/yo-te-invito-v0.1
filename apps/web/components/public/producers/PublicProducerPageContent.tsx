'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import type { ProducerDetail, PublicProducerEventSummary } from '@/repositories/interfaces';
import { useRepositories } from '@/repositories/context';
import { producersKeys } from '@/lib/query/keys';
import { useRecordPublicProducerView } from '@/lib/query/public-engagement';
import { PublicProducerHero } from './PublicProducerHero';
import { PublicProducerGallery } from './PublicProducerGallery';
import { PublicProducerEventsSection } from './PublicProducerEventsSection';
import { ProducerRatingSummary } from './ProducerRatingSummary';
import { ProducerPublicCommentsSection } from './ProducerPublicCommentsSection';
import { ProducerFollowButton } from '@/components/me/ProducerFollowButton';

type Props = {
  producer: ProducerDetail;
  tenantId: string;
};

export function PublicProducerPageContent({ producer, tenantId }: Props) {
  const repos = useRepositories();
  const [descExpanded, setDescExpanded] = useState(false);
  const description = producer.longDescription?.trim();
  const idOrSlug = producer.slug?.trim() || producer.id;
  useRecordPublicProducerView(idOrSlug, tenantId, true);

  const { data: reviewsSummary } = useQuery({
    queryKey: [...producersKeys.detail(idOrSlug), 'reviews-summary'],
    queryFn: () => repos.producers.getReviewsSummary(idOrSlug),
  });

  const scrollToEvents = useCallback(() => {
    document.getElementById('producer-events')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <>
      <Link href="/home" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Volver
      </Link>

      <PublicProducerHero producer={producer} onScrollToEvents={scrollToEvents} />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <ProducerFollowButton
          producerProfileId={producer.id}
          displayName={producer.displayName}
        />
      </div>

      {description ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-text">Sobre nosotros</h2>
          <p
            className={`mt-3 text-text-muted leading-relaxed whitespace-pre-wrap ${
              descExpanded ? '' : 'line-clamp-6'
            }`}
          >
            {description}
          </p>
          {description.length > 400 ? (
            <button
              type="button"
              className="mt-2 text-sm font-medium text-accent hover:underline"
              onClick={() => setDescExpanded((v) => !v)}
            >
              {descExpanded ? 'Ver menos' : 'Leer más'}
            </button>
          ) : null}
        </section>
      ) : null}

      <PublicProducerGallery
        items={producer.gallery ?? []}
        coverImageUrl={producer.coverImageUrl}
      />

      {reviewsSummary && reviewsSummary.totalReviews > 0 ? (
        <ProducerRatingSummary summary={reviewsSummary} />
      ) : null}

      <ProducerPublicCommentsSection producerIdOrSlug={idOrSlug} tenantId={tenantId} />

      {(producer.websiteUrl || producer.instagramUrl) && (
        <section className="mt-10 rounded-xl border border-border bg-bg-muted p-4">
          <h2 className="text-sm font-semibold text-text">Contacto</h2>
          <ul className="mt-2 space-y-1 text-sm text-text-muted">
            {producer.primaryPhone || producer.whatsapp ? (
              <li>
                Tel: {producer.whatsapp || producer.primaryPhone}
              </li>
            ) : null}
            {producer.primaryEmail ? <li>Email: {producer.primaryEmail}</li> : null}
            {producer.websiteUrl ? (
              <li>
                <a
                  href={producer.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  Sitio web
                </a>
              </li>
            ) : null}
            {producer.instagramUrl ? (
              <li>
                <a
                  href={
                    producer.instagramUrl.startsWith('http')
                      ? producer.instagramUrl
                      : `https://instagram.com/${producer.instagramUrl.replace(/^@/, '')}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  Instagram
                </a>
              </li>
            ) : null}
          </ul>
        </section>
      )}

      <PublicProducerEventsSection
        events={(producer.events ?? []) as PublicProducerEventSummary[]}
        tenantId={tenantId}
      />
    </>
  );
}
