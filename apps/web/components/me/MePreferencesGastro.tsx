'use client';

import Link from 'next/link';
import { Button, EmptyState, PageLoader } from '@/components';
import { gastroLocationPublicHref } from '@/lib/me/gastro-follow-href';
import { useTenant } from '@/hooks/useTenant';
import { useMeGastroFollows, useGastroFollowMutations } from '@/lib/query/me-portal';

export function MePreferencesGastro() {
  const { tenantId } = useTenant();
  const { data, isLoading } = useMeGastroFollows();
  const { unfollow } = useGastroFollowMutations();
  const follows = data?.follows ?? [];

  if (isLoading) {
    return <PageLoader message="Cargando locales…" />;
  }

  if (follows.length === 0) {
    return (
      <EmptyState
        title="No seguís locales gastronómicos"
        description="Explorá restaurantes y tocá «Seguir» en la ficha del local para ver novedades y promos."
        actionLabel="Explorar gastronomía"
        actionHref="/explore?category=gastro"
      />
    );
  }

  return (
    <ul className="space-y-3">
      {follows.map((f) => {
        const g = f.gastro;
        const href = g
          ? gastroLocationPublicHref(g.id, tenantId || 'tenant-demo')
          : '#';
        const busy = unfollow.isPending;
        const locationLabel = [g?.city, g?.province].filter(Boolean).join(', ');

        return (
          <li
            key={f.id}
            className="flex flex-col gap-3 rounded-lg border border-border bg-bg-muted p-4 sm:flex-row sm:items-center"
          >
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
          </li>
        );
      })}
    </ul>
  );
}
