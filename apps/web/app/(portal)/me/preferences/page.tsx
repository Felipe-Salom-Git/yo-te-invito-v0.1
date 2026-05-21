'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  PageContainer,
  SectionTitle,
  Button,
  Input,
  useToast,
} from '@/components';
import {
  usePortalPreferences,
  usePatchPortalPreferences,
  useMeFavorites,
  useMeFavoriteMutations,
  useMeExpectedEvents,
  useMeExpectedMutations,
} from '@/lib/query/me-portal';
import { getErrorMessage } from '@/lib/errors';
import type { UserFavorite, UserExpectedEvent } from '@yo-te-invito/shared';

type Tab = 'settings' | 'favorites' | 'expected';

export default function MePreferencesPage() {
  return (
    <Suspense fallback={<p className="text-text-muted">Cargando…</p>}>
      <MePreferencesContent />
    </Suspense>
  );
}

function MePreferencesContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: Tab =
    tabParam === 'favorites' ? 'favorites' : tabParam === 'expected' ? 'expected' : 'settings';

  return (
    <PageContainer>
      <SectionTitle>Preferencias</SectionTitle>
      <nav className="mt-4 flex flex-wrap gap-2 border-b border-border pb-4">
        <TabLink href="/me/preferences" active={tab === 'settings'} label="General" />
        <TabLink href="/me/preferences?tab=favorites" active={tab === 'favorites'} label="Favoritos" />
        <TabLink href="/me/preferences?tab=expected" active={tab === 'expected'} label="Eventos esperados" />
      </nav>
      <div className="mt-6">
        {tab === 'settings' && <SettingsTab />}
        {tab === 'favorites' && <FavoritesTab />}
        {tab === 'expected' && <ExpectedTab />}
      </div>
    </PageContainer>
  );
}

function TabLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`rounded px-3 py-1.5 text-sm ${
        active ? 'bg-accent text-bg' : 'text-text-muted hover:bg-bg-muted hover:text-text'
      }`}
    >
      {label}
    </Link>
  );
}

function SettingsTab() {
  const { addToast } = useToast();
  const { data: prefs } = usePortalPreferences();
  const patch = usePatchPortalPreferences();
  const [city, setCity] = useState('');
  const [webNotif, setWebNotif] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [reminder24h, setReminder24h] = useState(true);

  useEffect(() => {
    if (prefs) {
      setCity(prefs.preferredCity ?? '');
      setWebNotif(prefs.webNotificationsEnabled);
      setEmailNotif(prefs.emailNotificationsEnabled);
      setReminder24h(prefs.ticketReminder24hEnabled);
    }
  }, [prefs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    patch.mutate(
      {
        preferredCity: city.trim() || null,
        webNotificationsEnabled: webNotif,
        emailNotificationsEnabled: emailNotif,
        ticketReminder24hEnabled: reminder24h,
      },
      {
        onSuccess: () => addToast('Preferencias guardadas', 'success'),
        onError: (err) => addToast(getErrorMessage(err), 'error'),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <Input
        label="Ciudad preferida"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        placeholder="Buenos Aires"
      />
      <Checkbox id="web" checked={webNotif} onChange={setWebNotif} label="Notificaciones en la web" />
      <Checkbox id="email" checked={emailNotif} onChange={setEmailNotif} label="Notificaciones por email" />
      <Checkbox id="reminder" checked={reminder24h} onChange={setReminder24h} label="Recordatorio 24h antes del evento" />
      <Button type="submit" disabled={patch.isPending}>
        {patch.isPending ? 'Guardando…' : 'Guardar'}
      </Button>
    </form>
  );
}

function Checkbox({
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
        className="rounded border-border"
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

  if (isLoading) return <p className="text-text-muted">Cargando favoritos…</p>;
  if (favorites.length === 0) {
    return <p className="text-text-muted">No tenés favoritos guardados.</p>;
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
    <li className="flex items-center justify-between rounded-lg border border-border p-4">
      <div>
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

  if (isLoading) return <p className="text-text-muted">Cargando…</p>;
  if (list.length === 0) {
    return <p className="text-text-muted">No marcaste eventos como esperados.</p>;
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
    <li className="flex items-center justify-between rounded-lg border border-border p-4">
      <Link href={`/events/${item.eventId}`} className="font-medium text-text hover:text-accent">
        {title}
      </Link>
      <Button size="sm" variant="outline" disabled={removing} onClick={onRemove}>
        Quitar
      </Button>
    </li>
  );
}
