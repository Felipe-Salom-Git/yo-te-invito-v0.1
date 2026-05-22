'use client';

import Link from 'next/link';
import type { ProducerDetail } from '@/repositories/interfaces';
import { getProducerProfileCompleteness } from '@/lib/producer/producer-profile-completeness';
import { ProducerProfileBlockCard } from './ProducerProfileBlockCard';
import { hasAnyContactPreview } from './utils';

type Props = { profile: ProducerDetail };

export function ProducerContactBlock({ profile }: Props) {
  const { blocks } = getProducerProfileCompleteness(profile);
  const block = blocks.contact;
  const lines: string[] = [];
  if (profile.primaryPhone?.trim()) lines.push(`Tel: ${profile.primaryPhone}`);
  if (profile.whatsapp?.trim()) lines.push(`WhatsApp: ${profile.whatsapp}`);
  if (profile.primaryEmail?.trim()) lines.push(`Email: ${profile.primaryEmail}`);
  if (profile.websiteUrl?.trim()) lines.push('Sitio web');
  if (profile.instagramUrl?.trim()) lines.push('Instagram');
  const has = hasAnyContactPreview(profile);

  return (
    <ProducerProfileBlockCard
      icon={<span aria-hidden>✉</span>}
      title="Contacto"
      status={block.complete ? 'complete' : 'incomplete'}
      description="Teléfono, WhatsApp, email y redes visibles en la ficha pública."
      footer={
        <Link
          href={block.editHref}
          className="inline-flex w-full items-center justify-center rounded border border-border bg-transparent px-3 py-2 text-sm font-medium text-text transition-colors hover:border-accent hover:text-accent sm:w-auto"
        >
          {block.complete ? 'Editar contacto' : 'Completar contacto'}
        </Link>
      }
    >
      {!has ? (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-100/90">
          Agregá al menos un medio de contacto para que los usuarios puedan comunicarse con tu productora.
        </p>
      ) : (
        <ul className="space-y-1 text-sm text-text-muted">
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
    </ProducerProfileBlockCard>
  );
}
