'use client';

import Link from 'next/link';
import { useGastroActiveLocation } from '@/lib/gastro/GastroActiveLocationContext';
import { GastroLocationStatusBadge } from './GastroLocationStatusBadge';
import { GastroLocationShareActions } from '@/components/share/GastroLocationShareActions';
import { canShareGastroLocation } from '@/lib/share/gastroLocationShare';
import { Button } from '@/components';

function locationSubtitle(city: string | null, province: string | null, address: string | null) {
  const parts = [city, province].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  return address ?? 'Sin ubicación';
}

type Props = {
  /** Opens the «Ver ficha» modal for the clicked local. */
  onPreview: (profileId: string) => void;
};

export function GastroLocationsList({ onPreview }: Props) {
  const { locations, isLoading } = useGastroActiveLocation();

  if (isLoading) {
    return <p className="text-text-muted">Cargando locales…</p>;
  }

  if (locations.length === 0) {
    return (
      <div className="rounded-xl border border-border/80 bg-bg-muted/30 p-6">
        <p className="font-medium text-text">Todavía no tenés locales cargados</p>
        <p className="mt-1 text-sm text-text-muted">
          Creá tu primer local para publicar la ficha, contenido y descuentos.
        </p>
        <Link href="/gastro/local/nuevo" className="mt-4 inline-block">
          <Button type="button">Crear mi primer local</Button>
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
            Crear local
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
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onPreview(loc.id)}
                className="text-sm font-medium text-accent hover:underline focus:outline-none focus:ring-2 focus:ring-accent"
              >
                Ver ficha
              </button>
              <Link
                href={`/gastro/local/editar?profileId=${encodeURIComponent(loc.id)}`}
                className="text-sm font-medium text-accent hover:underline focus:outline-none focus:ring-2 focus:ring-accent"
              >
                Editar
              </Link>
              {canShareGastroLocation(loc.status) ? (
                <GastroLocationShareActions displayName={loc.displayName} profileId={loc.id} />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
