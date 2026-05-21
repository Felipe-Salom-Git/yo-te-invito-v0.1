'use client';

import Link from 'next/link';
import { Button, EmptyState, PageLoader } from '@/components';
import { useMeProducerFollows, useProducerFollowMutations } from '@/lib/query/me-portal';

export function MePreferencesProducers() {
  const { data, isLoading } = useMeProducerFollows();
  const { unfollow } = useProducerFollowMutations();
  const follows = data?.follows ?? [];

  if (isLoading) {
    return <PageLoader message="Cargando productoras…" />;
  }

  if (follows.length === 0) {
    return (
      <EmptyState
        title="No seguís productoras"
        description="Explorá productoras y tocá «Seguir» en su perfil para ver novedades y recomendaciones."
        actionLabel="Ver productoras"
        actionHref="/producers"
      />
    );
  }

  return (
    <ul className="space-y-3">
      {follows.map((f) => {
        const p = f.producer;
        const href = p?.slug ? `/producers/${p.slug}` : p?.id ? `/producers/${p.id}` : '#';
        const busy = unfollow.isPending;

        return (
          <li
            key={f.id}
            className="flex flex-col gap-3 rounded-lg border border-border bg-bg-muted p-4 sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 items-center gap-4">
              {p?.logoUrl ? (
                <img src={p.logoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-bg text-lg font-semibold text-accent">
                  {(p?.displayName ?? '?').charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <Link href={href} className="font-medium text-text hover:text-accent">
                  {p?.displayName ?? f.producerProfileId}
                </Link>
                {p?.city ? <p className="text-sm text-text-muted">{p.city}</p> : null}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                unfollow.mutate({ id: f.id, producerProfileId: f.producerProfileId })
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
