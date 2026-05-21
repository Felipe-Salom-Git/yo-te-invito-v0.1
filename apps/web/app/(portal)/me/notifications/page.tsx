'use client';

import Link from 'next/link';
import { PageContainer, SectionTitle, Button, PageLoader } from '@/components';
import {
  useMeNotifications,
  useNotificationMutations,
} from '@/lib/query/me-portal';

const KIND_LABELS: Record<string, string> = {
  TICKET_REMINDER_24H: 'Recordatorio de ticket',
  FAVORITE_EVENT_SOON: 'Favorito — evento pronto',
  EXPECTED_EVENT_SOON: 'Evento esperado',
};

export default function MeNotificationsPage() {
  const { data, isLoading } = useMeNotifications();
  const { markRead, markAllRead } = useNotificationMutations();

  if (isLoading) {
    return (
      <PageContainer>
        <PageLoader message="Cargando notificaciones…" />
      </PageContainer>
    );
  }

  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  return (
    <PageContainer>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle>Notificaciones</SectionTitle>
        {unread > 0 && (
          <Button
            size="sm"
            variant="outline"
            disabled={markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            {markAllRead.isPending ? '…' : 'Marcar todas como leídas'}
          </Button>
        )}
      </div>
      <p className="mt-1 text-sm text-text-muted">
        Recordatorios de tickets, favoritos y eventos que seguís. Configurá preferencias en{' '}
        <Link href="/me/preferences" className="text-accent hover:underline">
          Preferencias
        </Link>
        .
      </p>

      <ul className="mt-6 space-y-3">
        {items.length === 0 ? (
          <li className="rounded-lg border border-border p-6 text-center text-text-muted">
            No tenés notificaciones todavía.
          </li>
        ) : (
          items.map((n) => (
            <li
              key={n.id}
              className={`rounded-lg border p-4 ${
                n.readAt ? 'border-border bg-bg-muted/30' : 'border-accent/40 bg-accent/5'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-text-muted">
                    {KIND_LABELS[n.kind] ?? n.kind} ·{' '}
                    {new Date(n.createdAt).toLocaleString('es-AR')}
                  </p>
                  <p className="mt-1 font-medium text-text">{n.title}</p>
                  <p className="mt-1 text-sm text-text-muted">{n.body}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  {n.href && (
                    <Link
                      href={n.href}
                      className="text-sm text-accent hover:underline"
                    >
                      Ver →
                    </Link>
                  )}
                  {!n.readAt && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={markRead.isPending}
                      onClick={() => markRead.mutate(n.id)}
                    >
                      Leída
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </PageContainer>
  );
}
