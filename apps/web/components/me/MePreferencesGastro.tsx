'use client';

import Link from 'next/link';
import { Button, EmptyState, PageLoader } from '@/components';
import { gastroLocationPublicHref } from '@/lib/me/gastro-follow-href';
import { useTenant } from '@/hooks/useTenant';
import { useMeGastroFollows, useGastroFollowMutations } from '@/lib/query/me-portal';

export function MePreferencesGastro() {
  const { tenantId } = useTenant();
  const { data, isLoading } = useMeGastroFollows();
  const { unfollow, patchNotifications } = useGastroFollowMutations();
  const follows = data?.follows ?? [];

  if (isLoading) {
    return <PageLoader message="Cargando locales…" />;
  }

  if (follows.length === 0) {
    return (
      <EmptyState
        title="No seguís locales gastronómicos"
        description="Explorá restaurantes y tocá «Seguir» en la ficha del local. Te avisamos cuando publiquen descuentos activos (según tus preferencias)."
        actionLabel="Explorar gastronomía"
        actionHref="/explore?category=gastro"
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        Novedades de descuentos usan alertas web/email por local. El push global depende de tus
        preferencias de notificaciones en esta cuenta.
      </p>
      <ul className="space-y-3">
        {follows.map((f) => {
          const g = f.gastro;
          const href = g
            ? gastroLocationPublicHref(g.id, tenantId || 'tenant-demo')
            : '#';
          const busy = unfollow.isPending || patchNotifications.isPending;
          const locationLabel = [g?.city, g?.province].filter(Boolean).join(', ');

          return (
            <li
              key={f.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-bg-muted p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  {g?.logoUrl ? (
                    <img src={g.logoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-bg text-lg font-semibold text-accent">
                      {(g?.displayName ?? '?').charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <Link href={href} className="font-medium text-text hover:text-accent">
                      {g?.displayName ?? f.gastroProfileId}
                    </Link>
                    {locationLabel ? (
                      <p className="text-sm text-text-muted">{locationLabel}</p>
                    ) : null}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    unfollow.mutate({ id: f.id, gastroProfileId: f.gastroProfileId })
                  }
                >
                  {busy ? '…' : 'Dejar de seguir'}
                </Button>
              </div>
              <div className="flex flex-wrap gap-4 border-t border-border/60 pt-3 text-sm">
                <label className="flex items-center gap-2 text-text-muted">
                  <input
                    type="checkbox"
                    checked={f.webNotificationsEnabled}
                    disabled={busy}
                    onChange={(e) =>
                      patchNotifications.mutate({
                        id: f.id,
                        gastroProfileId: f.gastroProfileId,
                        body: { webNotificationsEnabled: e.target.checked },
                      })
                    }
                  />
                  Alertas en la web
                </label>
                <label className="flex items-center gap-2 text-text-muted">
                  <input
                    type="checkbox"
                    checked={f.emailNotificationsEnabled}
                    disabled={busy}
                    onChange={(e) =>
                      patchNotifications.mutate({
                        id: f.id,
                        gastroProfileId: f.gastroProfileId,
                        body: { emailNotificationsEnabled: e.target.checked },
                      })
                    }
                  />
                  Email
                </label>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
