'use client';

import type { PublicReviewReply } from '@yo-te-invito/shared';

const AUTHOR_LABELS: Record<PublicReviewReply['authorType'], string> = {
  PRODUCER: 'Organizador',
  GASTRO_OWNER: 'Establecimiento',
  HOTEL_OWNER: 'Hotel',
  PLATFORM_ADMIN: 'Plataforma',
};

export function ReviewReply({ reply }: { reply: PublicReviewReply }) {
  const label = AUTHOR_LABELS[reply.authorType] ?? reply.authorDisplayName;

  return (
    <div className="mt-4 rounded-lg border border-accent/20 bg-accent/5 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-accent">
        Respuesta · {label}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">{reply.body}</p>
    </div>
  );
}
