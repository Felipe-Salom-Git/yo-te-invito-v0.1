'use client';

import Link from 'next/link';
import type { ProducerDetail } from '@/repositories/interfaces';
import { getProducerProfileCompleteness } from '@/lib/producer/producer-profile-completeness';
import { ProducerProfileBlockCard } from './ProducerProfileBlockCard';

type Props = { profile: ProducerDetail };

export function ProducerIdentityBlock({ profile }: Props) {
  const { blocks } = getProducerProfileCompleteness(profile);
  const block = blocks.identity;
  const desc = (profile.longDescription?.trim() || profile.shortDescription?.trim() || '').slice(0, 160);
  const truncated =
    desc.length > 0
      ? `${desc}${(profile.longDescription?.length ?? 0) > 160 || desc.length >= 160 ? '…' : ''}`
      : 'Sin descripción todavía.';

  return (
    <ProducerProfileBlockCard
      icon={<span aria-hidden>◎</span>}
      title="Identidad"
      status={block.complete ? 'complete' : 'incomplete'}
      description="Nombre, subtítulo y descripción visibles en la ficha pública."
      footer={
        <Link
          href={block.editHref}
          className="inline-flex w-full items-center justify-center rounded border border-border bg-transparent px-3 py-2 text-sm font-medium text-text transition-colors hover:border-accent hover:text-accent sm:w-auto"
        >
          {block.complete ? 'Editar identidad' : 'Completar identidad'}
        </Link>
      }
    >
      <div className="flex gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border bg-bg">
          {profile.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-text-muted">—</div>
          )}
        </div>
        <div className="min-w-0 text-sm">
          <p className="font-medium text-text">{profile.displayName}</p>
          <p className="line-clamp-2 text-text-muted">{truncated}</p>
        </div>
      </div>
    </ProducerProfileBlockCard>
  );
}
