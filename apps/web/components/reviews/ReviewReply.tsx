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
  const dateLabel = new Date(reply.createdAt).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <aside
      className="mt-4 rounded-lg border border-accent/25 border-l-4 border-l-accent bg-accent/5 px-4 py-3 sm:px-5"
      aria-label="Respuesta oficial"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          Respuesta oficial · {label}
        </p>
        <time className="text-xs text-text-muted/80" dateTime={reply.createdAt}>
          {dateLabel}
        </time>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">{reply.body}</p>
    </aside>
  );
}
