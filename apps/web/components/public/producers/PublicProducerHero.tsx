'use client';

import type { ProducerDetail } from '@/repositories/interfaces';

type Props = {
  producer: Pick<
    ProducerDetail,
    | 'displayName'
    | 'shortDescription'
    | 'logoUrl'
    | 'coverImageUrl'
    | 'primaryPhone'
    | 'primaryEmail'
    | 'whatsapp'
    | 'secondaryPhone'
    | 'secondaryEmail'
  >;
  onScrollToEvents?: () => void;
};

function firstPhone(p: Props['producer']): string | null {
  return p.whatsapp?.trim() || p.primaryPhone?.trim() || p.secondaryPhone?.trim() || null;
}

function firstEmail(p: Props['producer']): string | null {
  return p.primaryEmail?.trim() || p.secondaryEmail?.trim() || null;
}

export function PublicProducerHero({ producer, onScrollToEvents }: Props) {
  const phone = firstPhone(producer);
  const email = firstEmail(producer);
  const cover = producer.coverImageUrl?.trim();

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-bg-muted">
      <div
        className="absolute inset-0 bg-gradient-to-t from-bg via-bg/80 to-bg/30"
        aria-hidden
      />
      {cover ? (
        <img
          src={cover}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-accent-surface/40 to-bg-muted" />
      )}

      <div className="relative z-10 flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:p-10">
        <div className="flex shrink-0 items-center justify-center">
          {producer.logoUrl?.trim() ? (
            <img
              src={producer.logoUrl}
              alt=""
              className="h-24 w-24 rounded-full border-2 border-white/20 object-cover shadow-lg sm:h-28 sm:w-28"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/20 bg-bg text-3xl font-bold text-accent sm:h-28 sm:w-28">
              {producer.displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-text sm:text-3xl">{producer.displayName}</h1>
          {producer.shortDescription ? (
            <p className="mt-2 max-w-2xl text-text-muted">{producer.shortDescription}</p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            {email ? (
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center rounded-full border border-accent-muted bg-accent-surface/80 px-4 py-2 text-sm font-medium text-accent-soft hover:bg-accent-surface"
              >
                Enviar mail
              </a>
            ) : null}
            {phone ? (
              <a
                href={`tel:${phone.replace(/\s/g, '')}`}
                className="inline-flex items-center rounded-full border border-border bg-bg/80 px-4 py-2 text-sm font-medium text-text hover:border-accent"
              >
                Llamar
              </a>
            ) : null}
            {onScrollToEvents ? (
              <button
                type="button"
                onClick={onScrollToEvents}
                className="inline-flex items-center rounded-full border border-border bg-bg/80 px-4 py-2 text-sm font-medium text-text hover:border-accent"
              >
                Ver eventos
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
