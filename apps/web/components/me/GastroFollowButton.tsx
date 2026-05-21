'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components';
import { useTenant } from '@/hooks/useTenant';
import { useGastroFollowMutations, useGastroFollowStatus } from '@/lib/query/me-portal';

type Props = {
  gastroProfileId: string;
  displayName?: string;
  className?: string;
};

export function GastroFollowButton({ gastroProfileId, displayName, className }: Props) {
  const { status } = useSession();
  const router = useRouter();
  const { tenantId } = useTenant();
  const t = tenantId || 'tenant-demo';
  const { data: statusData, isLoading } = useGastroFollowStatus(
    gastroProfileId,
    status === 'authenticated',
  );
  const { follow, unfollow } = useGastroFollowMutations();

  if (status === 'loading' || isLoading) {
    return (
      <Button type="button" variant="secondary" disabled className={className}>
        …
      </Button>
    );
  }

  if (status !== 'authenticated') {
    return (
      <Button
        type="button"
        variant="secondary"
        className={className}
        onClick={() =>
          router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`)
        }
      >
        Iniciá sesión para seguir
      </Button>
    );
  }

  const following = statusData?.following ?? false;
  const followId = statusData?.followId ?? null;
  const busy = follow.isPending || unfollow.isPending;

  if (following && followId) {
    return (
      <Button
        type="button"
        variant="secondary"
        className={className}
        disabled={busy}
        onClick={() => unfollow.mutate({ id: followId, gastroProfileId })}
      >
        {busy ? '…' : 'Dejar de seguir'}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="primary"
      className={className}
      disabled={busy}
      onClick={() =>
        follow.mutate({
          gastroProfileId,
          tenantId: t,
        })
      }
    >
      {busy ? '…' : `Seguir${displayName ? ` a ${displayName}` : ''}`}
    </Button>
  );
}
