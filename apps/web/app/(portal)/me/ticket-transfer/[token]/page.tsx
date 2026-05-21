'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageContainer, SectionTitle, Button, PageLoader, useToast } from '@/components';
import { useTicketTransferLookup, useTicketTransferMutations } from '@/lib/query/me-portal';
import { getErrorMessage } from '@/lib/errors';

export default function AcceptTransferPage() {
  const params = useParams();
  const router = useRouter();
  const token = (params?.token as string) ?? '';
  const { addToast } = useToast();
  const { data, isLoading, error } = useTicketTransferLookup(token);
  const { accept, reject } = useTicketTransferMutations();

  const handleAccept = () => {
    if (!token) return;
    accept.mutate(token, {
      onSuccess: (res) => {
        addToast(res.message ?? 'Transferencia completada', 'success');
        router.push(`/me/tickets/${res.destinationTicket.ticketId}`);
      },
      onError: (err) => addToast(getErrorMessage(err), 'error'),
    });
  };

  const handleReject = () => {
    if (!data?.offer.id) return;
    reject.mutate(data.offer.id, {
      onSuccess: () => {
        addToast('Transferencia rechazada. El vendedor recuperó su ticket.', 'success');
        router.push('/me/activity?tab=transfers');
      },
      onError: (err) => addToast(getErrorMessage(err), 'error'),
    });
  };

  if (!token) {
    return (
      <PageContainer>
        <p className="text-text-muted">Enlace de transferencia inválido.</p>
        <Link href="/me" className="mt-4 text-accent hover:underline">
          Ir a mi espacio
        </Link>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer>
        <PageLoader />
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer>
        <SectionTitle>Transferencia</SectionTitle>
        <p className="mt-2 text-sm text-text-muted">
          {error ? getErrorMessage(error) : 'No se encontró esta transferencia o ya no está disponible.'}
        </p>
        <Link href="/me/tickets" className="mt-6 inline-block text-sm text-text-muted hover:text-text">
          ← Mis tickets
        </Link>
      </PageContainer>
    );
  }

  const { offer, canAccept, canReject, legalNotice } = data;
  const eventTitle = offer.event?.title ?? 'Entrada';
  const seller = offer.sellerDisplayName ?? 'Un usuario';

  return (
    <PageContainer>
      <SectionTitle>Aceptar transferencia</SectionTitle>
      <p className="mt-2 max-w-lg text-sm text-text-muted">
        <span className="font-medium text-text">{seller}</span> te transfirió &ldquo;{eventTitle}&rdquo;.
        Al aceptar, recibirás un ticket nuevo con un código QR distinto. Tenés que estar registrado e iniciar
        sesión.
      </p>
      {offer.message && (
        <p className="mt-3 max-w-lg rounded border border-border bg-bg-muted p-3 text-sm italic text-text-muted">
          {offer.message}
        </p>
      )}
      {offer.event?.startAt && (
        <p className="mt-2 text-sm text-text-muted">
          Evento: {new Date(offer.event.startAt).toLocaleString('es-AR')}
          {offer.event.venueName ? ` · ${offer.event.venueName}` : ''}
        </p>
      )}
      <p className="mt-2 text-xs text-text-muted">
        Vence: {new Date(offer.expiresAt).toLocaleString('es-AR')}
      </p>

      <div className="mt-6 max-w-md rounded-lg border border-border bg-bg-muted p-6">
        <p className="text-xs text-text-muted">{legalNotice}</p>
        <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-text-muted">
          <li>Solo usuarios con cuenta pueden aceptar o rechazar.</li>
          <li>El QR del vendedor deja de servir al completarse.</li>
          <li>Si el enlace venció, pedile al vendedor que cree una nueva oferta.</li>
        </ul>

        <div className="mt-6 flex flex-wrap gap-2">
          {canAccept && (
            <Button type="button" disabled={accept.isPending} onClick={handleAccept}>
              {accept.isPending ? 'Procesando…' : 'Aceptar entrada'}
            </Button>
          )}
          {canReject && (
            <Button
              type="button"
              variant="outline"
              disabled={reject.isPending}
              onClick={handleReject}
            >
              {reject.isPending ? 'Rechazando…' : 'Rechazar'}
            </Button>
          )}
          {!canAccept && !canReject && (
            <p className="text-sm text-text-muted">
              No podés gestionar esta transferencia (puede ser tuya, estar reservada para otro usuario o
              haber finalizado).
            </p>
          )}
        </div>
      </div>

      <Link href="/me/tickets" className="mt-6 inline-block text-sm text-text-muted hover:text-text">
        ← Mis tickets
      </Link>
    </PageContainer>
  );
}
