'use client';

import Link from 'next/link';
import type { TicketTransferOfferSummary } from '@yo-te-invito/shared';
import { transferOfferStatusLabel } from '@/lib/me/ticket-transfer-labels';
import { buildTransferAcceptUrl } from '@/lib/me/transfer';
import { Button, useToast } from '@/components';
import { useTicketTransferMutations } from '@/lib/query/me-portal';
import { getErrorMessage } from '@/lib/errors';

type Props = {
  offer: TicketTransferOfferSummary;
  currentUserId?: string;
  onCancel?: (offerId: string) => void;
  cancelling?: boolean;
};

export function TransferOfferRow({ offer, currentUserId, onCancel, cancelling }: Props) {
  const { addToast } = useToast();
  const { reject } = useTicketTransferMutations();
  const isSeller = currentUserId === offer.sellerUserId;
  const isBuyer = currentUserId === offer.buyerUserId;
  const pending = offer.status === 'AVAILABLE' || offer.status === 'RESERVED';
  const canAccept =
    !isSeller &&
    pending &&
    (!offer.buyerUserId || offer.buyerUserId === currentUserId);
  const canReject = canAccept;
  const acceptUrl = buildTransferAcceptUrl(offer.acceptToken);

  const copyLink = () => {
    void navigator.clipboard?.writeText(acceptUrl).then(
      () => addToast('Enlace copiado', 'success'),
      () => addToast(acceptUrl, 'info'),
    );
  };

  const handleReject = () => {
    reject.mutate(offer.id, {
      onSuccess: () => addToast('Transferencia rechazada', 'success'),
      onError: (err) => addToast(getErrorMessage(err), 'error'),
    });
  };

  return (
    <li className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-text">
            {offer.event?.title ?? `Ticket ${offer.sourceTicketId.slice(0, 8)}…`}
          </p>
          <p className="text-sm text-text-muted">
            {isSeller ? 'Enviada' : isBuyer ? 'Recibida' : 'Transferencia'} ·{' '}
            {transferOfferStatusLabel(offer.status, offer.rejectedAt)}
          </p>
          {offer.sellerDisplayName && isBuyer && (
            <p className="text-xs text-text-muted">De: {offer.sellerDisplayName}</p>
          )}
          {offer.recipientEmail && isSeller && (
            <p className="text-xs text-text-muted">Para: {offer.recipientEmail}</p>
          )}
          {offer.message && (
            <p className="mt-1 text-xs italic text-text-muted">&ldquo;{offer.message}&rdquo;</p>
          )}
          {offer.event?.startAt && (
            <p className="text-xs text-text-muted">
              Evento: {new Date(offer.event.startAt).toLocaleString('es-AR')}
            </p>
          )}
          <p className="text-xs text-text-muted">
            Vence: {new Date(offer.expiresAt).toLocaleString('es-AR')}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {offer.status === 'COMPLETED' && offer.destinationTicketId && (
          <Link
            href={`/me/tickets/${offer.destinationTicketId}`}
            className="text-sm text-accent hover:underline"
          >
            Ver ticket recibido
          </Link>
        )}
        {isSeller && pending && (
          <>
            <Button type="button" size="sm" variant="outline" onClick={copyLink}>
              Copiar enlace
            </Button>
            {onCancel && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={cancelling}
                onClick={() => onCancel(offer.id)}
              >
                Cancelar
              </Button>
            )}
            <Link
              href={`/me/tickets/${offer.sourceTicketId}`}
              className="self-center text-sm text-text-muted hover:text-accent"
            >
              Ver ticket
            </Link>
          </>
        )}
        {canAccept && (
          <Link href={acceptUrl} className="text-sm font-medium text-accent hover:underline">
            Aceptar transferencia →
          </Link>
        )}
        {canReject && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={reject.isPending}
            onClick={handleReject}
          >
            {reject.isPending ? 'Rechazando…' : 'Rechazar'}
          </Button>
        )}
      </div>
    </li>
  );
}
