'use client';

import { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRepositories } from '@/repositories/context';
import { useSearchParams } from 'next/navigation';
import { PageContainer, SectionTitle, Button } from '@/components';

function PublicProducersListingContent() {
  const repos = useRepositories();
  const searchParams = useSearchParams();
  const initialPage = parseInt(searchParams?.get('page') ?? '1', 10);
  const [page, setPage] = useState(initialPage);

  const { data, isLoading, error } = useQuery({
    queryKey: ['producers', 'list', page],
    queryFn: () => repos.producers.list({ page, limit: 12 }),
  });

  const producers = data?.producers ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 12);

  return (
    <PageContainer>
      <div className="mb-6">
        <SectionTitle>Productoras</SectionTitle>
        <p className="mt-2 text-text-muted">Descubrí a los mejores organizadores de eventos.</p>
      </div>

      {isLoading ? (
        <p className="text-text-muted">Cargando...</p>
      ) : error ? (
        <p className="text-red-400">Error al cargar las productoras</p>
      ) : producers.length === 0 ? (
        <p className="text-text-muted">No hay productoras disponibles por el momento.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {producers.map((producer) => (
            <Link
              key={producer.id}
              href={`/producers/${producer.slug ?? producer.id}`}
              className="group flex flex-col items-center rounded-xl border border-border bg-bg-muted p-6 text-center transition-colors hover:border-accent"
            >
              <div className="mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-accent text-bg font-bold">
                {producer.logoUrl ? (
                  <img
                    src={producer.logoUrl}
                    alt={producer.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">{producer.displayName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <h3 className="font-semibold text-text group-hover:text-accent">
                {producer.displayName}
              </h3>
              {producer.shortDescription && (
                <p className="mt-2 line-clamp-2 text-sm text-text-muted">
                  {producer.shortDescription}
                </p>
              )}
              {(producer.ratingAvg != null || producer.ratingCount > 0) && (
                <div className="mt-4 flex items-center justify-center gap-1 text-sm font-medium text-amber-400">
                  <span>★</span>
                  <span>{producer.ratingAvg?.toFixed(1) ?? '-'}</span>
                  <span className="text-xs text-text-muted">({producer.ratingCount})</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-4">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <span className="flex items-center text-sm text-text-muted">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Siguiente
          </Button>
        </div>
      )}
    </PageContainer>
  );
}

export default function PublicProducersListingPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <p className="text-text-muted">Cargando...</p>
        </PageContainer>
      }
    >
      <PublicProducersListingContent />
    </Suspense>
  );
}
