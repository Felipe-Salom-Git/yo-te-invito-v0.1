'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  PageContainer,
  SectionTitle,
  PageLoader,
  EmptyState,
  QueryError,
  useToast,
} from '@/components';
import { PortalTabNav } from '@/components/me/portal-ui';
import { TransferOfferRow } from '@/components/me/TransferOfferRow';
import { useMeActivity, useMeTransferOffers, useTicketTransferMutations } from '@/lib/query/me-portal';
import { getErrorMessage } from '@/lib/errors';

type Tab = 'attended' | 'reviews' | 'transfers';

export default function MeActivityPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <PageLoader message="Cargando actividad…" />
        </PageContainer>
      }
    >
      <MeActivityContent />
    </Suspense>
  );
}

function MeActivityContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: Tab =
    tabParam === 'reviews' ? 'reviews' : tabParam === 'transfers' ? 'transfers' : 'attended';

  const { data, isLoading, isError, error, refetch } = useMeActivity();

  if (isLoading) {
    return (
      <PageContainer>
        <PageLoader message="Cargando actividad…" />
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer>
        <SectionTitle>Actividad</SectionTitle>
        <QueryError
          className="mt-6"
          message={getErrorMessage(error)}
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <SectionTitle>Actividad</SectionTitle>
      <p className="mt-1 text-sm text-text-muted">
        Eventos a los que fuiste, reseñas publicadas y transferencias personales de entradas.
      </p>
      <PortalTabNav
        tabs={[
          { href: '/me/activity?tab=attended', label: 'Asistidos', active: tab === 'attended' },
          { href: '/me/activity?tab=reviews', label: 'Mis reseñas', active: tab === 'reviews' },
          {
            href: '/me/activity?tab=transfers',
            label: 'Transferencias',
            active: tab === 'transfers',
          },
        ]}
      />

      <div className="mt-6">
        {tab === 'attended' && (
          <ul className="space-y-3">
            {(data?.attended ?? []).length === 0 ? (
              <EmptyState
                title="Sin eventos asistidos"
                description="Cuando uses un ticket en la puerta, el evento aparecerá acá."
                actionLabel="Mis tickets"
                actionHref="/me/tickets"
              />
            ) : (
              data?.attended.map((e) => (
                <li key={e.eventId} className="rounded-lg border border-border p-4">
                  <Link
                    href={`/events/${e.eventId}`}
                    className="font-medium text-text hover:text-accent"
                  >
                    {e.title}
                  </Link>
                  <p className="text-sm text-text-muted">
                    {new Date(e.startAt).toLocaleDateString('es-AR')}
                    {e.hasReview ? ' · Reseña publicada' : ' · Sin reseña'}
                  </p>
                </li>
              ))
            )}
          </ul>
        )}

        {tab === 'reviews' && (
          <ul className="space-y-3">
            {(data?.reviews ?? []).length === 0 ? (
              <EmptyState
                title="No publicaste reseñas aún"
                description="Después de asistir a un evento podés valorarlo desde la ficha o desde acá cuando esté disponible."
                actionLabel="Explorar eventos"
                actionHref="/explore"
              />
            ) : (
              data?.reviews.map((r) => (
                <li key={r.id} className="rounded-lg border border-border p-4">
                  <p className="font-medium text-text">{r.eventTitle ?? r.eventId}</p>
                  {r.overallRating != null && (
                    <p className="text-sm text-text-muted">Puntuación: {r.overallRating}/5</p>
                  )}
                  {r.comment && <p className="mt-2 text-sm text-text">{r.comment}</p>}
                </li>
              ))
            )}
          </ul>
        )}

        {tab === 'transfers' && <TransfersTab />}
      </div>
    </PageContainer>
  );
}

function TransfersTab() {
  const { data: session } = useSession();
  const userId =
    (session?.user as { userId?: string })?.userId ??
    (session?.user as { id?: string })?.id;
  const { addToast } = useToast();
  const { data, isLoading, isError, error, refetch } = useMeTransferOffers({ role: 'all' });
  const { cancel } = useTicketTransferMutations();
  const offers = data?.offers ?? [];

  if (isLoading) {
    return <PageLoader message="Cargando transferencias…" />;
  }

  if (isError) {
    return (
      <QueryError message={getErrorMessage(error)} onRetry={() => void refetch()} />
    );
  }

  if (offers.length === 0) {
    return (
      <EmptyState
        title="No hay transferencias en tu historial"
        description="La transferencia es personal: enviás un enlace a otra persona registrada. No es marketplace de reventa."
        actionLabel="Mis tickets"
        actionHref="/me/tickets"
      />
    );
  }

  return (
    <>
      <p className="mb-4 text-sm text-text-muted">
        Transferencia personal entre usuarios. Podés cancelar una oferta pendiente que hayas enviado o
        aceptar/rechazar las que recibas.
      </p>
      <ul className="space-y-3">
        {offers.map((offer) => (
          <TransferOfferRow
            key={offer.id}
            offer={offer}
            currentUserId={userId}
            cancelling={cancel.isPending}
            onCancel={(id) =>
              cancel.mutate(id, {
                onSuccess: () => addToast('Transferencia cancelada', 'success'),
                onError: (err) => addToast(getErrorMessage(err), 'error'),
              })
            }
          />
        ))}
      </ul>
    </>
  );
}
