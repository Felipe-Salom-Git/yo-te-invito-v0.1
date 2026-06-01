'use client';

import Link from 'next/link';
import {
  PageContainer,
  SectionTitle,
  Button,
  PageLoader,
  EmptyState,
  QueryError,
} from '@/components';
import { MePushAlertPreferences } from '@/components/me/MePushAlertPreferences';
import { MePushNotificationsPanel } from '@/components/me/MePushNotificationsPanel';
import {
  useMeNotifications,
  useNotificationMutations,
} from '@/lib/query/me-portal';
import { getErrorMessage } from '@/lib/errors';

const KIND_LABELS: Record<string, string> = {
  TICKET_REMINDER_24H: 'Recordatorio de ticket',
  FAVORITE_EVENT_SOON: 'Favorito — evento pronto',
  EXPECTED_EVENT_SOON: 'Evento esperado',
  TRANSFER_OFFER_PENDING: 'Transferencia pendiente',
  TICKET_TRANSFER_ACCEPTED: 'Transferencia aceptada',
  TICKET_TRANSFER_REJECTED: 'Transferencia rechazada',
  TICKET_TRANSFER_CANCELLED: 'Transferencia cancelada',
  REVIEW_PENDING: 'Calificación pendiente',
  FOLLOWED_PRODUCER_NEW_EVENT: 'Productora que seguís',
  FOLLOWED_GASTRO_NEW_DISCOUNT: 'Local gastronómico que seguís',
  FAVORITE_INTEREST_NEW_CONTENT: 'Nuevo para tus intereses',
  EVENT_APPROVED_BY_ADMIN: 'Evento aprobado',
  EVENT_REJECTED_BY_ADMIN: 'Evento rechazado',
  REVIEW_RECEIVED: 'Nueva valoración',
  REVIEW_OFFICIAL_REPLY: 'Respuesta a tu reseña',
  REVIEW_DISPUTE_CREATED: 'Disputa de valoración',
  REVIEW_DISPUTE_ACCEPTED: 'Disputa aceptada',
  REVIEW_DISPUTE_REJECTED: 'Disputa rechazada',
  REVIEW_MODERATION_HIDDEN: 'Reseña ocultada',
  REVIEW_MODERATION_RESTORED: 'Reseña restaurada',
};

export default function MeNotificationsPage() {
  const { data, isLoading, isError, error, refetch } = useMeNotifications();
  const { markRead, markAllRead } = useNotificationMutations();

  if (isLoading) {
    return (
      <PageContainer>
        <PageLoader message="Cargando notificaciones…" />
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer>
        <SectionTitle>Notificaciones</SectionTitle>
        <QueryError
          className="mt-6"
          message={getErrorMessage(error)}
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }

  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  return (
    <PageContainer>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle className="!mb-0">Notificaciones</SectionTitle>
        {unread > 0 && (
          <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-medium text-accent">
            {unread} sin leer
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-text-muted">
        Recordatorios, valoraciones, disputas y novedades de tus eventos. Configurá preferencias en{' '}
        <Link href="/me/preferences" className="text-accent hover:underline">
          Preferencias
        </Link>
        .
      </p>

      <MePushNotificationsPanel />
      <MePushAlertPreferences />

      {unread > 0 && (
        <div className="mt-6">
          <Button
            size="sm"
            variant="outline"
            disabled={markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            {markAllRead.isPending ? '…' : 'Marcar todas como leídas'}
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No tenés notificaciones todavía"
            description="Cuando haya recordatorios o novedades de favoritos y eventos esperados, aparecerán acá."
            actionLabel="Configurar preferencias"
            actionHref="/me/preferences"
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((n) => (
            <li
              key={n.id}
              className={`rounded-lg border p-4 transition-colors ${
                n.readAt
                  ? 'border-border bg-bg-muted/30'
                  : 'border-accent/40 bg-accent/5'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-text-muted">
                    {KIND_LABELS[n.kind] ?? n.kind} ·{' '}
                    {new Date(n.createdAt).toLocaleString('es-AR')}
                    {!n.readAt && (
                      <span className="ml-2 font-medium text-accent">· Nueva</span>
                    )}
                  </p>
                  <p className="mt-1 font-medium text-text">{n.title}</p>
                  <p className="mt-1 text-sm text-text-muted">{n.body}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-end">
                  {n.href && (
                    <Link
                      href={n.href}
                      className="inline-flex rounded border border-border px-3 py-1.5 text-sm text-accent hover:bg-bg-muted"
                    >
                      Ver contenido
                    </Link>
                  )}
                  {!n.readAt && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={markRead.isPending}
                      onClick={() => markRead.mutate(n.id)}
                    >
                      Marcar leída
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
