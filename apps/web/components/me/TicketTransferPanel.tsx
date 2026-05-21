'use client';

import { useState } from 'react';
import type { MeTicketDetail, TicketTransferOfferSummary } from '@yo-te-invito/shared';
import {
  TICKET_TRANSFER_CREATE_HINT,
  TICKET_TRANSFER_LEGAL_NOTICE,
} from '@yo-te-invito/shared';
import { Button, useToast } from '@/components';
import { useTicketTransferMutations } from '@/lib/query/me-portal';
import { buildTransferAcceptUrl } from '@/lib/me/transfer';
import { TRANSFER_OFFER_STATUS_LABELS } from '@/lib/domainLabels';
import { getErrorMessage } from '@/lib/errors';

type Props = {
  ticket: MeTicketDetail;
  offer: TicketTransferOfferSummary | null | undefined;
  canTransfer: boolean;
};

export function TicketTransferPanel({ ticket, offer, canTransfer }: Props) {
  const { addToast } = useToast();
  const { create, cancel } = useTicketTransferMutations();
  const [hours, setHours] = useState(72);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);

  const ticketId = ticket.ticketId;
  const activeOffer =
    offer && (offer.status === 'AVAILABLE' || offer.status === 'RESERVED') ? offer : null;

  const handleCreate = () => {
    const body: {
      expiresInHours: number;
      recipientEmail?: string;
      message?: string;
    } = { expiresInHours: hours };
    const email = recipientEmail.trim();
    if (email) body.recipientEmail = email;
    const note = message.trim();
    if (note) body.message = note;

    create.mutate(
      { ticketId, body },
      {
        onSuccess: (res) => {
          addToast(res.message, 'success');
          setShowForm(false);
          const url = buildTransferAcceptUrl(res.offer.acceptToken);
          void navigator.clipboard?.writeText(url).then(() => {
            addToast('Enlace copiado al portapapeles', 'success');
          });
        },
        onError: (err) => addToast(getErrorMessage(err), 'error'),
      },
    );
  };

  const handleCopyLink = () => {
    if (!activeOffer) return;
    const url = buildTransferAcceptUrl(activeOffer.acceptToken);
    void navigator.clipboard?.writeText(url).then(
      () => addToast('Enlace copiado', 'success'),
      () => addToast(url, 'info'),
    );
  };

  const handleCancel = () => {
    if (!activeOffer) return;
    cancel.mutate(activeOffer.id, {
      onSuccess: () => addToast('Transferencia cancelada. Tu ticket volvió a estar válido.', 'success'),
      onError: (err) => addToast(getErrorMessage(err), 'error'),
    });
  };

  if (ticket.status === 'TRANSFERRED') {
    return (
      <section className="mt-8 w-full max-w-sm rounded-lg border border-border p-4">
        <h3 className="font-medium text-text">Transferencia</h3>
        <p className="mt-2 text-sm text-text-muted">
          Transferiste esta entrada. El receptor tiene un ticket nuevo con otro QR.
        </p>
      </section>
    );
  }

  if (activeOffer) {
    const expires = new Date(activeOffer.expiresAt).toLocaleString('es-AR');
    return (
      <section className="mt-8 w-full max-w-sm rounded-lg border border-sky-500/30 bg-sky-500/5 p-4">
        <h3 className="font-medium text-text">Transferencia en curso</h3>
        <p className="mt-1 text-sm text-text-muted">
          Estado: {TRANSFER_OFFER_STATUS_LABELS[activeOffer.status] ?? activeOffer.status}
        </p>
        {activeOffer.recipientEmail && (
          <p className="text-sm text-text-muted">Para: {activeOffer.recipientEmail}</p>
        )}
        {activeOffer.message && (
          <p className="mt-1 text-sm text-text-muted italic">&ldquo;{activeOffer.message}&rdquo;</p>
        )}
        <p className="text-sm text-text-muted">Vence: {expires}</p>
        <p className="mt-3 text-xs text-text-muted">
          El QR de arriba no sirve para ingresar hasta completar o cancelar la transferencia.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="primary" onClick={handleCopyLink}>
            Copiar enlace para aceptar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={cancel.isPending}
            onClick={handleCancel}
          >
            {cancel.isPending ? 'Cancelando…' : 'Cancelar transferencia'}
          </Button>
        </div>
      </section>
    );
  }

  if (!canTransfer) {
    return null;
  }

  return (
    <section className="mt-8 w-full max-w-sm rounded-lg border border-border p-4">
      <h3 className="font-medium text-text">Transferencia personal</h3>
      <p className="mt-1 text-xs text-text-muted">
        Regalo o cesión a otra persona con cuenta — no es reventa ni marketplace.
      </p>
      <p className="mt-2 text-sm text-text-muted">{TICKET_TRANSFER_CREATE_HINT}</p>
      <p className="mt-3 rounded border border-border/80 bg-bg-muted p-3 text-xs text-text-muted">
        {TICKET_TRANSFER_LEGAL_NOTICE}
      </p>
      {!showForm ? (
        <Button type="button" className="mt-4" variant="outline" onClick={() => setShowForm(true)}>
          Transferir ticket
        </Button>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block text-sm text-text">
            Email del receptor (opcional)
            <input
              type="email"
              className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-sm"
              placeholder="usuario@ejemplo.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </label>
          <p className="text-xs text-text-muted">
            Si lo completás, solo ese usuario registrado podrá aceptar o rechazar. Si no, cualquiera con el
            enlace podrá hacerlo.
          </p>
          <label className="block text-sm text-text">
            Mensaje (opcional)
            <textarea
              className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-sm"
              rows={2}
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <label className="block text-sm text-text">
            Validez del enlace (horas)
            <select
              className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-sm"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
            >
              <option value={24}>24 h</option>
              <option value={48}>48 h</option>
              <option value={72}>72 h</option>
              <option value={168}>7 días</option>
            </select>
          </label>
          <div className="flex gap-2">
            <Button type="button" disabled={create.isPending} onClick={handleCreate}>
              {create.isPending ? 'Iniciando…' : 'Iniciar transferencia'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
