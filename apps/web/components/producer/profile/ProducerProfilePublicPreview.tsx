'use client';

import Link from 'next/link';
import type { ProducerDetail } from '@/repositories/interfaces';
import { getProducerPublicPath } from '@/lib/producer/public-path';
import { getProducerProfileCompleteness } from '@/lib/producer/producer-profile-completeness';
import { hasAnyContactPreview } from './utils';
import { CopyReferralLinkButton } from '@/components/producer/referrals/CopyReferralLinkButton';

type Props = {
  profile: ProducerDetail;
};

export function ProducerProfilePublicPreview({ profile }: Props) {
  const path = getProducerPublicPath(profile);
  const abs =
    typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
  const { isPubliclyListed, profileStatus } = getProducerProfileCompleteness(profile);
  const showContact = hasAnyContactPreview(profile);

  const desc =
    profile.shortDescription?.trim() ||
    profile.longDescription?.trim()?.slice(0, 120) ||
    'Completá la descripción en Identidad.';

  return (
    <div className="rounded-xl border border-accent/20 bg-bg p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-accent">
        Vista previa pública
      </p>
      <p className="mt-1 text-xs text-text-muted">
        Así se ve el encabezado de tu ficha. El detalle completo está en la página pública.
      </p>

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-bg-muted/40">
        {profile.coverImageUrl ? (
          <div className="relative aspect-[3/1] w-full bg-bg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profile.coverImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-[3/1] w-full bg-gradient-to-br from-bg-muted to-bg" />
        )}
        <div className="relative px-4 pb-4 pt-10">
          <div className="absolute -top-8 left-4 h-16 w-16 overflow-hidden rounded-xl border-2 border-bg bg-bg shadow-md">
            {profile.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.logoUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-lg text-text-muted">
                ◇
              </div>
            )}
          </div>
          <h3 className="text-lg font-semibold text-text">{profile.displayName}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-text-muted">{desc}</p>
          {showContact ? (
            <p className="mt-2 text-xs text-text-muted">
              {[
                profile.primaryPhone && `Tel. ${profile.primaryPhone}`,
                profile.whatsapp && `WhatsApp`,
                profile.primaryEmail && profile.primaryEmail,
                profile.city && profile.city,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          ) : (
            <p className="mt-2 text-xs italic text-text-muted">Sin contacto público aún</p>
          )}
        </div>
      </div>

      {!isPubliclyListed ? (
        <p className="mt-3 rounded border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-100/90">
          Estado del perfil: <span className="font-medium">{profileStatus ?? '—'}</span>. Si no
          está activo, la ficha puede no listarse en la plataforma aunque el enlace directo exista.
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          href={path}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center rounded border border-accent-muted bg-accent-surface/80 px-3 py-2 text-sm font-medium text-accent-soft hover:bg-accent-surface"
        >
          Ver ficha pública
        </Link>
        <CopyReferralLinkButton
          text={abs}
          label="Copiar enlace"
          className="flex-1"
        />
      </div>
    </div>
  );
}
