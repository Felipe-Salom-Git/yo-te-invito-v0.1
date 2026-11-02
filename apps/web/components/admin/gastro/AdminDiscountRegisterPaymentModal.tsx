'use client';

import { useState } from 'react';
import { formatBenefitMoneyCents, mapBenefitSettlementErrorMessage } from '@yo-te-invito/shared';
import { Button, Modal, useToast } from '@/components';
import { pesosInputToCentsString } from '@/lib/admin/pesos-input';
import { periodLabel } from '@/lib/gastro/discount-economic-summary-ui';
import {
  DISCOUNT_PAYMENT_COPY,
  buildDiscountPaymentBody,
  type PayableSettlementOption,
} from '@/lib/admin/discount-settlement-actions-ui';
import { useRegisterDiscountPayment } from '@/lib/query/gastro-discount-settlement-actions';

const inputClass = 'mt-1 w-full rounded border border-border bg-bg px-2 py-1';

/** G10.D4 — CASH payment attributed to ONE discount in ONE settlement (max = discount CASH balance). */
export function AdminDiscountRegisterPaymentModal({
  discountId,
  options,
  onClose,
}: {
  discountId: string;
  options: PayableSettlementOption[];
  onClose: () => void;
}) {
  const { addToast } = useToast();
  const register = useRegisterDiscountPayment();
  const [settlementId, setSettlementId] = useState(options[0]?.settlementId ?? '');
  const [pesos, setPesos] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const option = options.find((o) => o.settlementId === settlementId) ?? null;

  const submit = async () => {
    const result = buildDiscountPaymentBody(
      { amountCents: pesosInputToCentsString(pesos), date, reference, notes, proofUrl },
      option,
      discountId,
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    try {
      await register.mutateAsync({ settlementId, body: result.body });
      addToast('Pago CASH registrado', 'success');
      onClose();
    } catch (err) {
      setError(mapBenefitSettlementErrorMessage(err));
    }
  };

  return (
    <Modal
      isOpen
      size="md"
      onClose={register.isPending ? () => undefined : onClose}
      title={DISCOUNT_PAYMENT_COPY.registerTitle}
      footer={
        <>
          <Button variant="secondary" disabled={register.isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={register.isPending || !option} onClick={() => void submit()}>
            {register.isPending ? 'Registrando…' : DISCOUNT_PAYMENT_COPY.register}
          </Button>
        </>
      }
    >
      <p className="text-xs text-text-muted">{DISCOUNT_PAYMENT_COPY.mode}</p>
      <div className="mt-3 grid gap-3 text-sm">
        <label>
          {DISCOUNT_PAYMENT_COPY.settlementLabel}
          <select className={inputClass} value={settlementId} onChange={(e) => setSettlementId(e.target.value)}>
            {options.map((o) => (
              <option key={o.settlementId} value={o.settlementId}>
                {periodLabel(o.periodKey)} · saldo {formatBenefitMoneyCents(o.discountRemainingCents)}
              </option>
            ))}
          </select>
        </label>
        {option ? (
          <div className="rounded border border-border p-2">
            <p className="text-xs text-text-muted">{DISCOUNT_PAYMENT_COPY.remainingLabel}</p>
            <p className="font-medium">{formatBenefitMoneyCents(option.discountRemainingCents)}</p>
            {option.cappedBySettlement ? (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                {DISCOUNT_PAYMENT_COPY.cappedBySettlement} Máximo: {formatBenefitMoneyCents(option.maxCents)}
              </p>
            ) : null}
          </div>
        ) : null}
        <label>
          Monto (ARS, sin centavos)
          <input className={inputClass} inputMode="numeric" value={pesos} onChange={(e) => setPesos(e.target.value)} />
        </label>
        <label>
          Fecha del pago
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Referencia (opcional)
          <input className={inputClass} maxLength={120} value={reference} onChange={(e) => setReference(e.target.value)} />
        </label>
        <label>
          Notas (opcional)
          <textarea className={inputClass} rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <label>
          Comprobante URL (opcional)
          <input
            type="url"
            placeholder="https://…"
            className={inputClass}
            maxLength={2048}
            value={proofUrl}
            onChange={(e) => setProofUrl(e.target.value)}
          />
          <span className="mt-1 block text-xs text-text-muted">{DISCOUNT_PAYMENT_COPY.proofHint}</span>
        </label>
      </div>
      {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
    </Modal>
  );
}
