'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { Button } from '@/components';
import type { UserPreferences } from '@/repositories/interfaces';

function toggleId(list: string[], id: string, on: boolean): string[] {
  const set = new Set(list);
  if (on) set.add(id);
  else set.delete(id);
  return [...set];
}

type Props = {
  eventId: string;
};

/**
 * Favoritos + “Esperado” (wishlist) — persiste en GET/PATCH /me/preferences.
 */
export function EventEngagementRow({ eventId }: Props) {
  const { data: session, status } = useSession();
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const userId =
    (session?.user as { userId?: string })?.userId ??
    (session?.user as { id?: string })?.id ??
    '';

  const { data: prefs } = useQuery({
    queryKey: ['userPreferences', userId],
    queryFn: () => repos.users.getPreferences(userId),
    enabled: !!userId && status === 'authenticated',
  });

  const mut = useMutation({
    mutationFn: (patch: Partial<UserPreferences>) => repos.users.updatePreferences(userId, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPreferences'] });
      queryClient.invalidateQueries({ queryKey: ['home'] });
    },
  });

  if (status === 'loading') {
    return null;
  }
  if (!session?.user || !userId) {
    return (
      <p className="text-sm text-text-muted">
        <Link href="/login" className="text-accent hover:underline">
          Iniciá sesión
        </Link>{' '}
        para guardar favoritos o marcar como esperado.
      </p>
    );
  }

  const favs = prefs?.favoriteEventIds ?? [];
  const expected = prefs?.expectedEventIds ?? [];
  const isFav = favs.includes(eventId);
  const isExpected = expected.includes(eventId);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant={isFav ? 'primary' : 'outline'}
        disabled={mut.isPending}
        onClick={() =>
          mut.mutate({ favoriteEventIds: toggleId(favs, eventId, !isFav) })
        }
      >
        {isFav ? '★ En favoritos' : '☆ Favorito'}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={isExpected ? 'primary' : 'outline'}
        disabled={mut.isPending}
        onClick={() =>
          mut.mutate({ expectedEventIds: toggleId(expected, eventId, !isExpected) })
        }
      >
        {isExpected ? '✓ Lo espero' : 'Lo espero'}
      </Button>
      <Link href="/cuenta/favoritos" className="text-xs text-text-muted hover:text-accent">
        Mis favoritos
      </Link>
    </div>
  );
}
