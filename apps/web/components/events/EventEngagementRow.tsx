'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button, useToast } from '@/components';
import { useTenant } from '@/hooks/useTenant';
import {
  EXPECTED_EVENT_BUTTON_ACTIVE_LABEL,
  EXPECTED_EVENT_BUTTON_LABEL,
  EXPECTED_EVENT_BUTTON_TITLE,
  EXPECTED_EVENT_LOGIN_HINT,
} from '@/lib/engagement/expected-event-copy';
import {
  useMeFavorites,
  useMeFavoriteMutations,
  useMeExpectedEvents,
  useMeExpectedMutations,
} from '@/lib/query/me-portal';
import { getErrorMessage } from '@/lib/errors';

type Props = {
  eventId: string;
};

/**
 * Favoritos + eventos de interés — persiste en /me/favorites y /me/expected-events.
 */
export function EventEngagementRow({ eventId }: Props) {
  const { data: session, status } = useSession();
  const { tenantId } = useTenant();
  const { addToast } = useToast();
  const t = tenantId ?? 'tenant-demo';

  const isAuthed = status === 'authenticated' && !!session?.user;
  const { data: favData } = useMeFavorites(isAuthed);
  const { data: expData } = useMeExpectedEvents(isAuthed);
  const { create: createFav, remove: removeFav } = useMeFavoriteMutations();
  const { create: createExp, remove: removeExp } = useMeExpectedMutations();

  if (status === 'loading') {
    return null;
  }
  if (!isAuthed) {
    return (
      <p className="text-sm text-text-muted">
        <Link href="/login" className="text-accent hover:underline">
          Iniciá sesión
        </Link>{' '}
        {EXPECTED_EVENT_LOGIN_HINT}
      </p>
    );
  }

  const favorite = favData?.favorites.find(
    (f) => f.entityType === 'event' && f.entityId === eventId,
  );
  const expected = expData?.expectedEvents.find((e) => e.eventId === eventId);
  const isFav = !!favorite;
  const isExpected = !!expected;
  const pending = createFav.isPending || removeFav.isPending || createExp.isPending || removeExp.isPending;

  const onError = (err: unknown) => addToast(getErrorMessage(err), 'error');

  const toggleFav = () => {
    if (isFav && favorite) {
      removeFav.mutate(favorite.id, { onError });
    } else {
      createFav.mutate(
        { entityType: 'event', entityId: eventId, tenantId: t },
        { onError },
      );
    }
  };

  const toggleExpected = () => {
    if (isExpected && expected) {
      removeExp.mutate(expected.id, { onError });
    } else {
      createExp.mutate({ eventId, tenantId: t }, { onError });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant={isFav ? 'primary' : 'outline'}
        disabled={pending}
        onClick={toggleFav}
      >
        {isFav ? '★ En favoritos' : '☆ Favorito'}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={isExpected ? 'primary' : 'outline'}
        disabled={pending}
        onClick={toggleExpected}
        title={EXPECTED_EVENT_BUTTON_TITLE}
        aria-label={EXPECTED_EVENT_BUTTON_TITLE}
      >
        {isExpected ? EXPECTED_EVENT_BUTTON_ACTIVE_LABEL : EXPECTED_EVENT_BUTTON_LABEL}
      </Button>
      <Link href="/me/preferences?tab=favorites" className="text-xs text-text-muted hover:text-accent">
        Mis favoritos
      </Link>
    </div>
  );
}
