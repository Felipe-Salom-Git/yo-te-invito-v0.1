'use client';

import Link from 'next/link';
import { useGastroActiveLocation } from '@/lib/gastro/GastroActiveLocationContext';
import { GastroLocationStatusBadge } from './GastroLocationStatusBadge';
import { Button } from '@/components';

function locationSubtitle(city: string | null, province: string | null, address: string | null) {
  const parts = [city, province].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  return address ?? 'Sin ubicación';
}

export function GastroLocationsList() {
  const { locations, isLoading } = useGastroActiveLocation();

  if (isLoading) {
    return <p className="text-text-muted">Cargando locales…</p>;
  }

  if (locations.length === 0) {
    return (
      <div className="rounded-xl border border-border/80 bg-bg-muted/30 p-6">
        <p className="text-text-muted">Todavía no tenés locales cargados.</p>
        <Link href="/gastro/local/editar" className="mt-4 inline-block">
          <Button type="button">Crear primer local</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text">Mis locales</h2>
        <Link href="/gastro/local/nuevo">
          <Button type="button" variant="secondary">
            Nuevo local / propuesta
          </Button>
        </Link>
      </div>
      <ul className="divide-y divide-border/60 rounded-xl border border-border/80 bg-bg-muted/30">
        {locations.map((loc) => (
          <li key={loc.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-medium text-text">{loc.displayName}</p>
              <p className="mt-1 text-sm text-text-muted">
                {locationSubtitle(loc.city, loc.province, loc.address)}
              </p>
              <div className="mt-2">
                <GastroLocationStatusBadge status={loc.status} />
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link
                href={`/gastro/local?profileId=${encodeURIComponent(loc.id)}`}
                className="text-sm font-medium text-accent hover:underline"
              >
                Ver ficha
              </Link>
              <Link
                href={`/gastro/local/editar?profileId=${encodeURIComponent(loc.id)}`}
                className="text-sm font-medium text-accent hover:underline"
              >
                Editar
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
