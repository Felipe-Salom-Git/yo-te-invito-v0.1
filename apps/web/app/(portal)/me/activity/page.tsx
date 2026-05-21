'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PageContainer, SectionTitle, PageLoader, useToast } from '@/components';
import { TransferOfferRow } from '@/components/me/TransferOfferRow';
import { useMeActivity, useMeTransferOffers, useTicketTransferMutations } from '@/lib/query/me-portal';
import { getErrorMessage } from '@/lib/errors';

type Tab = 'attended' | 'reviews' | 'transfers';

export default function MeActivityPage() {
  return (
    <Suspense fallback={<p className="text-text-muted">Cargando…</p>}>
      <MeActivityContent />
    </Suspense>
  );
}

function MeActivityContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: Tab =
    tabParam === 'reviews' ? 'reviews' : tabParam === 'transfers' ? 'transfers' : 'attended';

  const { data, isLoading } = useMeActivity();

  if (isLoading) {
    return (
      <PageContainer>
        <PageLoader message="Cargando actividad…" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <SectionTitle>Actividad</SectionTitle>
      <nav className="mt-4 flex flex-wrap gap-2 border-b border-border pb-4">
        <TabLink href="/me/activity?tab=attended" active={tab === 'attended'} label="Asistidos" />
        <TabLink href="/me/activity?tab=reviews" active={tab === 'reviews'} label="Mis reseñas" />
        <TabLink href="/me/activity?tab=transfers" active={tab === 'transfers'} label="Transferencias" />
      </nav>

      <div className="mt-6">
        {tab === 'attended' && (
          <ul className="space-y-3">
            {(data?.attended ?? []).length === 0 ? (
              <p className="text-text-muted">Todavía no hay eventos asistidos registrados.</p>
            ) : (
              data?.attended.map((e) => (
                <li key={e.eventId} className="rounded-lg border border-border p-4">
                  <Link href={`/events/${e.eventId}`} className="font-medium text-text hover:text-accent">
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
              <p className="text-text-muted">No publicaste reseñas aún.</p>
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
  const { data, isLoading } = useMeTransferOffers({ role: 'all' });
  const { cancel } = useTicketTransferMutations();
  const offers = data?.offers ?? [];

  if (isLoading) {
    return <p className="text-text-muted">Cargando transferencias…</p>;
  }
  if (offers.length === 0) {
    return <p className="text-text-muted">No hay transferencias en tu historial.</p>;
  }

  return (
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
