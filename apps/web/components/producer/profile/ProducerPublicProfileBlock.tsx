'use client';

import Link from 'next/link';
import type { ProducerDetail } from '@/repositories/interfaces';
import { getProducerPublicPath } from '@/lib/producer/public-path';
import {
  getProducerProfileCompleteness,
  profileStatusLabel,
} from '@/lib/producer/producer-profile-completeness';
import { CopyReferralLinkButton } from '@/components/producer/referrals/CopyReferralLinkButton';
import { ProducerProfileBlockCard } from './ProducerProfileBlockCard';

type Props = { profile: ProducerDetail };

export function ProducerPublicProfileBlock({ profile }: Props) {
  const path = getProducerPublicPath(profile);
  const abs =
    typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
  const { isPubliclyListed } = getProducerProfileCompleteness(profile);

  return (
    <ProducerProfileBlockCard
      icon={<span aria-hidden>↗</span>}
      title="Vista pública"
      status={isPubliclyListed ? 'complete' : 'incomplete'}
      description="Enlace directo a tu ficha. Las reseñas se gestionan en sus propias pantallas."
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href={path}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center rounded border border-accent-muted bg-accent-surface/80 px-3 py-2 text-sm font-medium text-accent-soft hover:bg-accent-surface"
          >
            Ver ficha pública
          </Link>
          <CopyReferralLinkButton text={abs} label="Copiar enlace" className="flex-1" />
        </div>
      }
    >
      <p className="break-all font-mono text-xs text-text-muted">{path}</p>
      <p className="mt-2 text-xs text-text-muted">
        Estado del perfil: <span className="text-text">{profileStatusLabel(profile.status)}</span>
        {isPubliclyListed
          ? ' · visible en listados del tenant cuando corresponda'
          : ' · puede no aparecer en listados hasta activarse'}
      </p>
    </ProducerProfileBlockCard>
  );
}
