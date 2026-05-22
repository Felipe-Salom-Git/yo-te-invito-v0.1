'use client';

import Link from 'next/link';
import type { ProducerDetail } from '@/repositories/interfaces';
import { getProducerPublicPath } from '@/lib/producer/public-path';
import {
  getProducerProfileCompleteness,
  profileStatusLabel,
} from '@/lib/producer/producer-profile-completeness';
import { CopyReferralLinkButton } from '@/components/producer/referrals/CopyReferralLinkButton';

type Props = {
  profile: ProducerDetail;
};

export function ProducerProfileHeader({ profile }: Props) {
  const { percent, checks, isPubliclyListed } = getProducerProfileCompleteness(profile);
  const complete = percent >= 100;
  const path = getProducerPublicPath(profile);
  const abs =
    typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
  const statusLabel = profileStatusLabel(profile.status);

  return (
    <header className="rounded-2xl border border-border/80 bg-bg-muted/40 p-5 sm:p-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-bg">
          {profile.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-3xl text-accent-soft/80">◇</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Tu productora
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text">
            {profile.displayName}
          </h1>
          {profile.shortDescription ? (
            <p className="mt-2 text-sm text-text-muted">{profile.shortDescription}</p>
          ) : (
            <p className="mt-2 text-sm italic text-text-muted">Sin subtítulo</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                complete
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-amber-500/25 bg-amber-500/10 text-amber-200/90'
              }`}
            >
              {complete
                ? 'Perfil básico completo'
                : `Perfil incompleto · ${percent}%`}
            </span>
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-text-muted">
              Estado: {statusLabel}
            </span>
            {!checks.hasContact ? (
              <span className="text-xs text-amber-200/80">Falta contacto</span>
            ) : null}
            {!isPubliclyListed ? (
              <span className="text-xs text-amber-200/80">
                Puede no listarse públicamente hasta activarse
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <CopyReferralLinkButton text={abs} label="Copiar enlace" className="shrink-0" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={path}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded border border-accent-muted bg-accent-surface/80 px-4 py-2 text-sm font-medium text-accent-soft transition-colors hover:bg-accent-surface"
        >
          Ver ficha pública
        </Link>
      </div>
    </header>
  );
}
