'use client';

import { useState } from 'react';
import {
  formatBenefitMoneyCents,
  isSafeExternalHttpUrl,
  mapBenefitSettlementErrorMessage,
  type BenefitSettlementDiscountCashLine,
  type BenefitVertical,
} from '@yo-te-invito/shared';
import { Button } from '@/components';
import { pesosInputToCentsString } from '@/lib/admin/pesos-input';
import { settlementDiscountPayOptions } from '@/lib/admin/settlement-transfer-attribution-ui';
import { useRegisterAdminBenefitSettlementTransfer } from '@/lib/query/benefit-settlements';

const inputClass = 'mt-1 w-full rounded border border-border bg-bg px-2 py-1';

type Props = {
  settlementId: string;
  vertical: BenefitVertical;
  cashOutstandingCents: string;
  discountCash: BenefitSettlementDiscountCashLine[];
};

/**
 * G7.12.4 / G10.D5 — register a CASH transfer from the settlement page.
 * GASTRO: the payment must name ONE discount (D-G10-7), capped by that discount's CASH balance.
 * ACTIVITY: unchanged (settlement level).
 */
export function SettlementRegisterTransferForm({ settlementId, vertical, cashOutstandingCents, discountCash }: Props) {
  const registerMutation = useRegisterAdminBenefitSettlementTransfer();
  const isGastro = vertical === 'GASTRO';
  const options = isGastro ? settlementDiscountPayOptions(discountCash, cashOutstandingCents) : [];
  const [discountId, setDiscountId] = useState(options[0]?.gastroDiscountId ?? '');
  const [pesos, setPesos] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const option = options.find((o) => o.gastroDiscountId === discountId) ?? options[0] ?? null;
  const maxCents = isGastro ? (option?.maxCents ?? '0') : cashOutstandingCents;

  if (isGastro && options.length === 0) {
    return (
      <p className="mt-3 text-sm text-text-muted">
        Ningún descuento tiene saldo CASH pendiente en esta liquidación.
      </p>
    );
  }

  const handleRegister = async () => {
    setError(null);
    const amountCents = pesosInputToCentsString(pesos);
    if (amountCents === '0') {
      setError('Ingresá un monto válido.');
      return;
    }
    if (isGastro && !option) {
      setError('Elegí el descuento al que corresponde el pago.');
      return;
    }
    if (proofUrl.trim() && !isSafeExternalHttpUrl(proofUrl)) {
      setError('El comprobante debe ser un link http:// o https://');
      return;
    }
    if (BigInt(amountCents) > BigInt(maxCents)) {
      setError(`El importe supera el pendiente (${formatBenefitMoneyCents(maxCents)}).`);
      return;
    }
    try {
      await registerMutation.mutateAsync({
        id: settlementId,
        body: {
          amountCents,
          currency: 'ARS',
          transferredAt: new Date(`${date}T12:00:00.000Z`).toISOString(),
          ...(isGastro && option ? { gastroDiscountId: option.gastroDiscountId } : {}),
          ...(reference.trim() ? { reference: reference.trim() } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
          ...(proofUrl.trim() ? { proofUrl: proofUrl.trim() } : {}),
        },
      });
      setPesos('');
      setReference('');
      setNotes('');
      setProofUrl('');
    } catch (err) {
      setError(mapBenefitSettlementErrorMessage(err));
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-border p-4">
      <h4 className="font-medium text-text">Registrar transferencia</h4>
      <p className="mt-1 text-sm text-text-muted">
        Pagos parciales permitidos. Máximo para este pago: {formatBenefitMoneyCents(maxCents)}
      </p>
      <div className="mt-3 grid max-w-md gap-3">
        {isGastro ? (
          <label className="text-sm">
            Descuento
            <select
              className={inputClass}
              value={option?.gastroDiscountId ?? ''}
              onChange={(e) => setDiscountId(e.target.value)}
            >
              {options.map((o) => (
                <option key={o.gastroDiscountId} value={o.gastroDiscountId}>
                  {o.discountTitle} · saldo CASH {formatBenefitMoneyCents(o.cashRemainingCents)}
                </option>
              ))}
            </select>
            {option?.cappedBySettlement ? (
              <span className="mt-1 block text-xs text-amber-700 dark:text-amber-300">
                La liquidación tiene pagos sin atribuir: el máximo es el pendiente de la liquidación.
              </span>
            ) : null}
          </label>
        ) : null}
        <label className="text-sm">
          Monto (ARS, sin centavos)
          <input className={inputClass} inputMode="numeric" value={pesos} onChange={(e) => setPesos(e.target.value)} />
        </label>
        <label className="text-sm">
          Fecha de la transferencia
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="text-sm">
          Referencia (opcional)
          <input className={inputClass} maxLength={120} value={reference} onChange={(e) => setReference(e.target.value)} />
        </label>
        <label className="text-sm">
          Notas (opcional)
          <textarea className={inputClass} rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <label className="text-sm">
          Link al comprobante (opcional)
          <input
            type="url"
            placeholder="https://…"
            className={inputClass}
            maxLength={2048}
            value={proofUrl}
            onChange={(e) => setProofUrl(e.target.value)}
          />
          <span className="mt-1 block text-xs text-text-muted">
            URL del comprobante (banco, Drive). La subida de archivos privados no está habilitada todavía.
          </span>
        </label>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <Button disabled={registerMutation.isPending} onClick={() => void handleRegister()}>
          {registerMutation.isPending ? 'Registrando…' : 'Registrar transferencia'}
        </Button>
      </div>
    </div>
  );
}
