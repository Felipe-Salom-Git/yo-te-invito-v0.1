'use client';

import Link from 'next/link';
import type { UserNotification } from '@yo-te-invito/shared';
import { useMeNotifications } from '@/lib/query/me-portal';
import {
  filterReviewNotifications,
  reviewNotificationLabel,
} from '@/lib/reviews/review-notifications';

const MAX_ALERTS = 5;

function alertStyles(kind: UserNotification['kind']) {
  if (kind === 'REVIEW_RECEIVED') {
    return 'border-accent/30 bg-accent/5';
  }
  if (kind === 'REVIEW_DISPUTE_ACCEPTED' || kind === 'REVIEW_MODERATION_HIDDEN') {
    return 'border-amber-500/30 bg-amber-500/5';
  }
  if (kind === 'REVIEW_DISPUTE_REJECTED' || kind === 'REVIEW_MODERATION_RESTORED') {
    return 'border-emerald-500/30 bg-emerald-500/5';
  }
  return 'border-border bg-bg-muted';
}

export function ManagedPortalReviewAlerts({
  enabled = true,
  heading = 'Novedades de valoraciones',
  defaultHref = '/producer/comments',
}: {
  enabled?: boolean;
  heading?: string;
  defaultHref?: string;
}) {
  const { data, isLoading } = useMeNotifications(enabled);

  const alerts = filterReviewNotifications(
    (data?.items ?? []).filter((n) =>
      [
        'REVIEW_RECEIVED',
        'REVIEW_DISPUTE_CREATED',
        'REVIEW_DISPUTE_ACCEPTED',
        'REVIEW_DISPUTE_REJECTED',
      ].includes(n.kind),
    ),
  ).slice(0, MAX_ALERTS);

  if (isLoading) {
    return (
      <section className="mt-8 rounded-xl border border-border/80 bg-bg-muted/40 p-4">
        <p className="text-sm text-text-muted">Cargando novedades de valoraciones…</p>
      </section>
    );
  }

  if (alerts.length === 0) return null;

  return (
    <section className="mt-8" aria-labelledby="managed-review-alerts-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="managed-review-alerts-heading" className="text-lg font-semibold text-text">
          {heading}
        </h2>
        <Link href="/me/notifications" className="text-xs text-accent hover:underline">
          Ver todas las notificaciones
        </Link>
      </div>
      <ul className="mt-3 space-y-3">
        {alerts.map((n) => {
          const href = n.href?.startsWith('/') ? n.href : defaultHref;
          return (
            <li
              key={n.id}
              className={`flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${alertStyles(n.kind)}`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-border/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">
                    {reviewNotificationLabel(n.kind)}
                  </span>
                  {!n.readAt ? (
                    <span className="text-[10px] font-medium text-accent">Nuevo</span>
                  ) : null}
                  <time className="text-[10px] text-text-muted" dateTime={n.createdAt}>
                    {new Date(n.createdAt).toLocaleString('es-AR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </time>
                </div>
                <p className="mt-1 font-medium text-text">{n.title}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-text-muted">{n.body}</p>
              </div>
              <Link
                href={href}
                className="shrink-0 text-sm font-medium text-accent hover:underline"
              >
                Ver valoraciones →
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
