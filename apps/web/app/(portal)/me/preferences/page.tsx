'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  PageContainer,
  SectionTitle,
  Button,
  PageLoader,
  EmptyState,
  useToast,
} from '@/components';
import { PortalTabNav } from '@/components/me/portal-ui';
import { MePreferencesInterests } from '@/components/me/MePreferencesInterests';
import { MePreferencesProducers } from '@/components/me/MePreferencesProducers';
import { MePreferencesGastro } from '@/components/me/MePreferencesGastro';
import {
  useMeFavorites,
  useMeFavoriteMutations,
  useMeExpectedEvents,
  useMeExpectedMutations,
  usePortalPreferences,
  usePatchPortalPreferences,
} from '@/lib/query/me-portal';
import { EXPECTED_EVENT_EMPTY_DESCRIPTION } from '@/lib/engagement/expected-event-copy';
import { getErrorMessage } from '@/lib/errors';
import type { UserFavorite, UserExpectedEvent } from '@yo-te-invito/shared';
import { useEffect, useState } from 'react';

type Tab = 'interests' | 'producers' | 'gastro' | 'favorites' | 'expected' | 'settings';

const TAB_LINKS: { tab: Tab; href: string; label: string }[] = [
  { tab: 'interests', href: '/me/preferences?tab=interests', label: 'Intereses' },
  { tab: 'producers', href: '/me/preferences?tab=producers', label: 'Productoras' },
  { tab: 'gastro', href: '/me/preferences?tab=gastro', label: 'Gastronomía' },
  { tab: 'favorites', href: '/me/preferences?tab=favorites', label: 'Favoritos' },
  { tab: 'expected', href: '/me/preferences?tab=expected', label: 'Eventos esperados' },
  { tab: 'settings', href: '/me/preferences?tab=settings', label: 'Notificaciones' },
];

function resolveTab(param: string | null): Tab {
  if (
    param === 'producers' ||
    param === 'gastro' ||
    param === 'favorites' ||
    param === 'expected' ||
    param === 'settings'
  ) {
    return param;
  }
  return 'interests';
}

export default function MePreferencesPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <PageLoader message="Cargando preferencias…" />
        </PageContainer>
      }
    >
      <MePreferencesContent />
    </Suspense>
  );
}

function MePreferencesContent() {
  const searchParams = useSearchParams();
  const tab = resolveTab(searchParams.get('tab'));

  return (
    <PageContainer>
      <SectionTitle>Preferencias</SectionTitle>
      <p className="mt-1 text-sm text-text-muted">
        Favoritos, productoras, locales gastronómicos, intereses y alertas.
      </p>
      <PortalTabNav
        tabs={TAB_LINKS.map((t) => ({
          href: t.href,
          label: t.label,
          active: tab === t.tab,
        }))}
      />
      <div className="mt-6">
        {tab === 'interests' && <MePreferencesInterests />}
        {tab === 'producers' && <MePreferencesProducers />}
        {tab === 'gastro' && <MePreferencesGastro />}
        {tab === 'favorites' && <FavoritesTab />}
        {tab === 'expected' && <ExpectedTab />}
        {tab === 'settings' && <NotificationsTab />}
      </div>
    </PageContainer>
  );
}

function NotificationsTab() {
  const { addToast } = useToast();
  const { data: prefs, isLoading } = usePortalPreferences();
  const patch = usePatchPortalPreferences();
  const [webNotif, setWebNotif] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [reminder24h, setReminder24h] = useState(true);
  const [expectedAlerts, setExpectedAlerts] = useState(true);

  useEffect(() => {
    if (prefs) {
      setWebNotif(prefs.webNotificationsEnabled);
      setEmailNotif(prefs.emailNotificationsEnabled);
      setReminder24h(prefs.ticketReminder24hEnabled);
      setExpectedAlerts(prefs.expectedEventNotificationsEnabled);
    }
  }, [prefs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    patch.mutate(
      {
        webNotificationsEnabled: webNotif,
        emailNotificationsEnabled: emailNotif,
        ticketReminder24hEnabled: reminder24h,
        expectedEventNotificationsEnabled: expectedAlerts,
      },
      {
        onSuccess: () => addToast('Preferencias guardadas', 'success'),
        onError: (err) => addToast(getErrorMessage(err), 'error'),
      },
    );
  };

  if (isLoading) {
    return <PageLoader message="Cargando preferencias…" />;
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <p className="text-sm text-text-muted">
        Alertas globales del portal. Las alertas por categorías se configuran en{' '}
        <Link href="/me/preferences?tab=interests" className="text-accent hover:underline">
          Intereses
        </Link>
        .
      </p>
      <PrefCheckbox id="web" checked={webNotif} onChange={setWebNotif} label="Notificaciones en la web" />
      <PrefCheckbox
        id="email"
        checked={emailNotif}
        onChange={setEmailNotif}
        label="Notificaciones por email"
      />
      <PrefCheckbox
        id="reminder"
        checked={reminder24h}
        onChange={setReminder24h}
        label="Recordatorio 24h antes del evento"
      />
      <PrefCheckbox
        id="expected"
        checked={expectedAlerts}
        onChange={setExpectedAlerts}
        label="Alertas de eventos que esperás"
      />
      <Button type="submit" disabled={patch.isPending}>
        {patch.isPending ? 'Guardando…' : 'Guardar'}
      </Button>
    </form>
  );
}

function PrefCheckbox({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-border accent-accent"
      />
      <label htmlFor={id} className="text-sm text-text">
        {label}
      </label>
    </div>
  );
}

function FavoritesTab() {
  const { data, isLoading } = useMeFavorites();
  const { remove } = useMeFavoriteMutations();
  const favorites = data?.favorites ?? [];

  if (isLoading) return <PageLoader message="Cargando favoritos…" />;
  if (favorites.length === 0) {
    return (
      <EmptyState
        title="No tenés favoritos guardados"
        description="Marcá eventos, locales o productos desde su ficha para verlos acá."
        actionLabel="Explorar"
        actionHref="/explore"
      />
    );
  }

  return (
    <ul className="space-y-3">
      {favorites.map((f) => (
        <FavoriteRow key={f.id} item={f} onRemove={() => remove.mutate(f.id)} removing={remove.isPending} />
      ))}
    </ul>
  );
}

function FavoriteRow({
  item,
  onRemove,
  removing,
}: {
  item: UserFavorite;
  onRemove: () => void;
  removing: boolean;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Link href={item.href ?? '#'} className="font-medium text-text hover:text-accent">
          {item.title ?? item.entityId}
        </Link>
        <p className="text-xs text-text-muted">{item.entityType}</p>
      </div>
      <Button size="sm" variant="outline" disabled={removing} onClick={onRemove}>
        Quitar
      </Button>
    </li>
  );
}

function ExpectedTab() {
  const { data, isLoading } = useMeExpectedEvents();
  const { remove } = useMeExpectedMutations();
  const list = data?.expectedEvents ?? [];

  if (isLoading) return <PageLoader message="Cargando eventos esperados…" />;
  if (list.length === 0) {
    return (
      <EmptyState
        title="No marcaste eventos como esperados"
        description={EXPECTED_EVENT_EMPTY_DESCRIPTION}
        actionLabel="Explorar eventos"
        actionHref="/explore"
      />
    );
  }

  return (
    <ul className="space-y-3">
      {list.map((e) => (
        <ExpectedRow
          key={e.id}
          item={e}
          onRemove={() => remove.mutate(e.id)}
          removing={remove.isPending}
        />
      ))}
    </ul>
  );
}

function ExpectedRow({
  item,
  onRemove,
  removing,
}: {
  item: UserExpectedEvent;
  onRemove: () => void;
  removing: boolean;
}) {
  const title = item.event?.title ?? item.eventId;
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <Link href={`/events/${item.eventId}`} className="font-medium text-text hover:text-accent">
        {title}
      </Link>
      <Button size="sm" variant="outline" disabled={removing} onClick={onRemove}>
        Quitar
      </Button>
    </li>
  );
}
