'use client';

import Link from 'next/link';
import type { GastroLocal } from '@/repositories/interfaces';
import { buildGastroGalleryImages } from '@/lib/gastro/gallery';
import { RentalOpeningHoursSummary } from '@/components/rentals/RentalOpeningHoursSummary';
import { RentalGalleryThumbnails } from '@/components/rentals/RentalGalleryThumbnails';

type GastroLocalPreviewProps = {
  local: GastroLocal;
  subcategoryName?: string | null;
};

export function GastroLocalPreview({ local, subcategoryName }: GastroLocalPreviewProps) {
  const galleryImages = buildGastroGalleryImages(local.bannerUrl, local.galleryUrls);
  const locationLine = [local.address, local.city, local.province].filter(Boolean).join(' · ');
  const description = local.detail?.trim() || local.description?.trim();

  return (
    <div className="space-y-6">
      {local.bannerUrl && (
        <div className="relative h-48 overflow-hidden rounded-xl border border-border sm:h-56">
          <img
            src={local.bannerUrl}
            alt=""
            className="h-full w-full object-cover"
          />
          {local.logoUrl && (
            <div className="absolute bottom-3 left-3 h-12 w-12 overflow-hidden rounded-full border-2 border-white/40 bg-bg-muted shadow">
              <img src={local.logoUrl} alt="" className="h-full w-full object-cover" />
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            {subcategoryName?.trim() || 'Local gastronómico'}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-text">{local.displayName}</h2>
          {local.summary?.trim() && (
            <p className="mt-2 max-w-2xl text-text-muted">{local.summary.trim()}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/gastronomicos/${local.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-accent/10"
          >
            Ver ficha pública
          </Link>
          <Link
            href="/gastro/local/editar"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent-hover"
          >
            Editar local
          </Link>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-border bg-bg-muted p-4 sm:grid-cols-2">
        <InfoBlock label="Ubicación" value={locationLine || null} />
        <InfoBlock label="Teléfono" value={local.contactPhone} />
        <InfoBlock label="Email" value={local.contactEmail} />
        {local.menuUrl?.trim() && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Menú</p>
            <a
              href={local.menuUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-block text-sm text-accent hover:underline"
            >
              Ver carta
            </a>
          </div>
        )}
        {local.websiteUrl?.trim() && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Web</p>
            <a
              href={local.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-block text-sm text-accent hover:underline"
            >
              Sitio web
            </a>
          </div>
        )}
        <div className="sm:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Horario de atención
          </p>
          <div className="mt-1">
            <RentalOpeningHoursSummary
              schedule={local.openingHours}
              note={local.openingHoursNote}
            />
          </div>
        </div>
      </div>

      {description && (
        <section>
          <h3 className="text-sm font-semibold text-text">Sobre el local</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-muted">
            {description}
          </p>
        </section>
      )}

      {galleryImages.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-text">Galería</h3>
          <div className="mt-3">
            <RentalGalleryThumbnails images={galleryImages} />
          </div>
        </section>
      )}
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-0.5 text-sm text-text">{value?.trim() ? value : '—'}</p>
    </div>
  );
}
