'use client';

import { useState } from 'react';
import { formatBenefitMoneyCents } from '@yo-te-invito/shared';
import { Button, Modal } from '@/components';
import { DISCOUNT_PAYMENT_COPY, parseReversalReason } from '@/lib/admin/discount-settlement-actions-ui';

type Props = {
  transfer: { amountCents: string; currency: string; context?: string } | null;
  pending: boolean;
  serverError: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
};

/**
 * G10.D4 — append-only reversal of a CASH transfer with a mandatory reason (modal, no browser prompt).
 * Mount with `key={transferId}` so the reason resets per transfer.
 */
export function ReverseTransferModal({ transfer, pending, serverError, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (!transfer) return null;

  const submit = () => {
    const parsed = parseReversalReason(reason);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    onConfirm(parsed.body.reason);
  };

  return (
    <Modal
      isOpen
      onClose={pending ? () => undefined : onClose}
      title={DISCOUNT_PAYMENT_COPY.reverseTitle}
      footer={
        <>
          <Button variant="secondary" disabled={pending} onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={pending || !reason.trim()} onClick={submit}>
            {pending ? 'Revirtiendo…' : 'Confirmar reversión'}
          </Button>
        </>
      }
    >
      <p className="text-sm">
        Pago de <span className="font-medium">{formatBenefitMoneyCents(transfer.amountCents, transfer.currency)}</span>
        {transfer.context ? ` · ${transfer.context}` : ''}
      </p>
      <p className="mt-1 text-xs text-text-muted">{DISCOUNT_PAYMENT_COPY.reverseHint}</p>
      <label className="mt-3 block text-sm">
        Motivo (obligatorio)
        <textarea
          className="mt-1 w-full rounded border border-border bg-bg px-2 py-1 text-sm"
          rows={3}
          maxLength={500}
          value={reason}
          disabled={pending}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      {error || serverError ? <p className="mt-2 text-sm text-red-500">{error ?? serverError}</p> : null}
    </Modal>
  );
}
