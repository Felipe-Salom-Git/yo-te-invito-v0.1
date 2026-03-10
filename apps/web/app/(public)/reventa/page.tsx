'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle } from '@/components';

export default function ReventaPage() {
  const repos = useRepositories();

  const { data: listings, isLoading } = useQuery({
    queryKey: ['resale', 'active'],
    queryFn: () => repos.resale.listActive(),
  });

  return (
    <PageContainer>
      <Link href="/home" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Inicio
      </Link>
      <SectionTitle>Reventa oficial</SectionTitle>
      <p className="mt-2 text-text-muted">
        Entradas en reventa de otros usuarios. Comprá de forma segura.
      </p>

      {isLoading ? (
        <p className="mt-6 text-text-muted">Cargando…</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {(listings ?? []).map((listing) => (
            <li key={listing.id}>
              <Link
                href={`/reventa/${listing.id}`}
                className="block rounded-lg border border-border bg-bg-muted p-4 transition-colors hover:border-accent"
              >
                <span className="font-medium text-text">Listing #{listing.id}</span>
                <p className="mt-1 text-sm text-text-muted">
                  Evento {listing.eventId} · ${(listing.askingPriceCents / 100).toLocaleString('es-AR')}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && (!listings || listings.length === 0) && (
        <p className="mt-6 text-text-muted">No hay entradas en reventa en este momento.</p>
      )}
    </PageContainer>
  );
}
