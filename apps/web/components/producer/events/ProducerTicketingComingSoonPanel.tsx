'use client';

import Link from 'next/link';
import { Button } from '@/components';
import {
  TICKETING_COMING_SOON_BADGE,
  TICKETING_COMING_SOON_BODY,
  TICKETING_COMING_SOON_TITLE,
  TICKETING_PUBLICITY_CTA,
} from '@/lib/producer/ticketing-config';
import { PRODUCER_EVENT_MODE_QUERY } from '@/lib/producer/event-mode';

type Props = {
  variant?: 'panel' | 'inline';
};

export function ProducerTicketingComingSoonPanel({ variant = 'panel' }: Props) {
  const publicityHref = `/producer/events/new?mode=${PRODUCER_EVENT_MODE_QUERY.publicity}`;

  if (variant === 'inline') {
    return (
      <div
        className="rounded-xl border border-dashed border-amber-500/35 bg-amber-500/5 px-5 py-5"
        role="status"
        aria-label={TICKETING_COMING_SOON_TITLE}
      >
        <p className="text-xs font-bold uppercase tracking-wider text-amber-200/90">
          {TICKETING_COMING_SOON_BADGE}
        </p>
        <p className="mt-1 text-lg font-semibold text-text">{TICKETING_COMING_SOON_TITLE}</p>
        <p className="mt-2 max-w-2xl text-sm text-text-muted">{TICKETING_COMING_SOON_BODY}</p>
        <Link href={publicityHref} className="mt-4 inline-block">
          <Button type="button" size="sm">
            {TICKETING_PUBLICITY_CTA}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-border/80 bg-bg-muted/50 px-6 py-10 text-center sm:px-10">
      <p className="text-xs font-bold uppercase tracking-wider text-amber-200/90">
        {TICKETING_COMING_SOON_BADGE}
      </p>
      <h1 className="mt-2 text-2xl font-bold text-text md:text-3xl">{TICKETING_COMING_SOON_TITLE}</h1>
      <p className="mt-4 text-sm leading-relaxed text-text-muted">{TICKETING_COMING_SOON_BODY}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href={publicityHref}>
          <Button type="button" className="w-full sm:w-auto">
            {TICKETING_PUBLICITY_CTA}
          </Button>
        </Link>
        <Link href="/producer/events">
          <Button type="button" variant="outline" className="w-full sm:w-auto">
            Volver a mis eventos
          </Button>
        </Link>
      </div>
    </div>
  );
}
