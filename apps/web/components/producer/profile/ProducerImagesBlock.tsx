'use client';

import Link from 'next/link';
import type { ProducerDetail } from '@/repositories/interfaces';
import { ProducerProfileBlockCard } from './ProducerProfileBlockCard';
import { normalizeGalleryForSave, parseGalleryUrls } from './utils';

type Props = { profile: ProducerDetail };

export function ProducerImagesBlock({ profile }: Props) {
  const rawGallery = parseGalleryUrls(profile);
  const cover = profile.coverImageUrl?.trim() ?? '';
  const galleryOnly = normalizeGalleryForSave(cover, rawGallery);
  const thumbs = galleryOnly.slice(0, 3);

  return (
    <ProducerProfileBlockCard
      icon={<span aria-hidden>▣</span>}
      title="Galería e imágenes"
      description="Gestioná la imagen de cabecera y las fotos que se muestran en tu perfil público."
      footer={
        <Link
          href="/producer/profile/images"
          className="inline-flex items-center justify-center rounded border border-border bg-transparent px-3 py-1.5 text-sm font-medium text-text transition-colors hover:border-accent hover:text-accent"
        >
          Gestionar imágenes
        </Link>
      }
    >
      {cover || galleryOnly.length > 0 ? (
        <div className="space-y-2">
          {cover ? (
            <div className="flex gap-2">
              <div className="h-14 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-bg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover} alt="" className="h-full w-full object-cover" />
              </div>
              <p className="self-center text-xs text-text-muted">Cabecera</p>
            </div>
          ) : null}
          <p className="text-xs text-text-muted">
            Galería: {galleryOnly.length} foto{galleryOnly.length === 1 ? '' : 's'}
          </p>
          {thumbs.length > 0 ? (
            <div className="flex gap-1">
              {thumbs.map((url) => (
                <div key={url} className="h-10 w-10 overflow-hidden rounded border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-text-muted">Todavía no cargaste imágenes para tu productora.</p>
      )}
    </ProducerProfileBlockCard>
  );
}
