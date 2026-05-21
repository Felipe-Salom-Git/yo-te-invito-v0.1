'use client';

import Link from 'next/link';
import { PageContainer, SectionTitle, PageLoader } from '@/components';
import { useMeProducerFollows } from '@/lib/query/me-portal';

export default function MeFollowingPage() {
  const { data, isLoading } = useMeProducerFollows();

  if (isLoading) {
    return (
      <PageContainer>
        <PageLoader message="Cargando productoras…" />
      </PageContainer>
    );
  }

  const follows = data?.follows ?? [];

  return (
    <PageContainer>
      <SectionTitle>Productoras que seguís</SectionTitle>
      <p className="mt-1 text-sm text-text-muted">
        Novedades y eventos de las productoras que elegiste seguir.
      </p>
      <Link href="/me/recommendations" className="mt-2 inline-block text-sm text-accent hover:underline">
        Ver recomendaciones de eventos →
      </Link>

      {follows.length === 0 ? (
        <p className="mt-8 text-text-muted">
          Todavía no seguís ninguna productora. Explorá{' '}
          <Link href="/producers" className="text-accent hover:underline">
            productoras
          </Link>{' '}
          y tocá «Seguir» en su perfil.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {follows.map((f) => {
            const p = f.producer;
            const href = p?.slug
              ? `/producers/${p.slug}`
              : p?.id
                ? `/producers/${p.id}`
                : '#';
            return (
              <li
                key={f.id}
                className="flex items-center gap-4 rounded-lg border border-border bg-bg-muted p-4"
              >
                {p?.logoUrl ? (
                  <img
                    src={p.logoUrl}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg text-lg font-semibold text-accent">
                    {(p?.displayName ?? '?').charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <Link href={href} className="font-medium text-text hover:text-accent">
                    {p?.displayName ?? f.producerProfileId}
                  </Link>
                  {p?.city ? (
                    <p className="text-sm text-text-muted">{p.city}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
}
