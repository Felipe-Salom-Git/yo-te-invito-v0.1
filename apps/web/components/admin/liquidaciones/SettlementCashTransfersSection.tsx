'use client';

import { useState } from 'react';
import {
  BENEFIT_CASH_COLLECTION_STATUS_LABEL,
  formatBenefitMoneyCents,
  mapBenefitSettlementErrorMessage,
  type BenefitSettlementSummary,
} from '@yo-te-invito/shared';
import { Badge, Button } from '@/components';
import { pesosInputToCentsString } from '@/lib/admin/pesos-input';
import {
  useAdminBenefitSettlementTransfers,
  useRegisterAdminBenefitSettlementTransfer,
  useReverseAdminBenefitSettlementTransfer,
} from '@/lib/query/benefit-settlements';

type Props = {
  settlementId: string;
  summary: BenefitSettlementSummary;
};

/**
 * G7.12.4 — CASH transfers (SETTLEMENT_LEVEL). Partial and multiple transfers allowed;
 * still allowed after CLOSED (closing freezes usages, not collection).
 */
export function SettlementCashTransfersSection({ settlementId, summary }: Props) {
  const { data } = useAdminBenefitSettlementTransfers(settlementId);
  const registerMutation = useRegisterAdminBenefitSettlementTransfer();
  const reverseMutation = useReverseAdminBenefitSettlementTransfer();
  const [pesos, setPesos] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const transfers = data?.data ?? [];
  const hasCashDue = summary.cashDueCents !== '0';
  const canRegister = hasCashDue && summary.cashOutstandingCents !== '0';

  const handleRegister = async () => {
    setError(null);
    const amountCents = pesosInputToCentsString(pesos);
    if (amountCents === '0') {
      setError('Ingresá un monto válido.');
      return;
    }
    if (BigInt(amountCents) > BigInt(summary.cashOutstandingCents)) {
      setError(
        `El importe supera el pendiente (${formatBenefitMoneyCents(summary.cashOutstandingCents)}).`,
      );
      return;
    }
    try {
      await registerMutation.mutateAsync({
        id: settlementId,
        body: {
          amountCents,
          currency: 'ARS',
          transferredAt: new Date(`${date}T12:00:00.000Z`).toISOString(),
          ...(reference.trim() ? { reference: reference.trim() } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        },
      });
      setPesos('');
      setReference('');
      setNotes('');
    } catch (err) {
      setError(mapBenefitSettlementErrorMessage(err));
    }
  };

  const handleReverse = async (transferId: string) => {
    setError(null);
    const reason = window.prompt('Motivo de reversión (obligatorio):');
    if (!reason?.trim()) return;
    if (!window.confirm('La transferencia no se eliminará; quedará registrada como revertida.\n\n¿Confirmar?')) {
      return;
    }
    try {
      await reverseMutation.mutateAsync({ id: settlementId, transferId, body: { reason: reason.trim() } });
    } catch (err) {
      setError(mapBenefitSettlementErrorMessage(err));
    }
  };

  return (
    <section className="mt-8 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-medium text-text">CASH — transferencias</h3>
        <Badge>{BENEFIT_CASH_COLLECTION_STATUS_LABEL[summary.cashCollectionStatus]}</Badge>
      </div>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-lg bg-bg-muted p-3">
          <dt className="text-xs text-text-muted">A transferir (cash due)</dt>
          <dd className="mt-1 text-lg font-semibold">{formatBenefitMoneyCents(summary.cashDueCents)}</dd>
        </div>
        <div className="rounded-lg bg-bg-muted p-3">
          <dt className="text-xs text-text-muted">Transferido (activas)</dt>
          <dd className="mt-1 text-lg font-semibold">
            {formatBenefitMoneyCents(summary.cashReceivedCents)}
          </dd>
        </div>
        <div className="rounded-lg bg-bg-muted p-3">
          <dt className="text-xs text-text-muted">Pendiente</dt>
          <dd className="mt-1 text-lg font-semibold">
            {formatBenefitMoneyCents(summary.cashOutstandingCents)}
          </dd>
        </div>
      </dl>
      {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}

      {transfers.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">Sin transferencias registradas.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="px-2 py-2">Fecha</th>
                <th className="px-2 py-2">Monto</th>
                <th className="px-2 py-2">Referencia</th>
                <th className="px-2 py-2">Estado</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t.id} className="border-b border-border/60">
                  <td className="px-2 py-2">{new Date(t.transferredAt).toLocaleDateString('es-AR')}</td>
                  <td className={`px-2 py-2 ${t.isActive ? '' : 'text-text-muted line-through'}`}>
                    {formatBenefitMoneyCents(t.amountCents)}
                  </td>
                  <td className="px-2 py-2">{t.reference ?? '—'}</td>
                  <td className="px-2 py-2">
                    <Badge>{t.isActive ? 'Registrada' : 'Revertida'}</Badge>
                  </td>
                  <td className="px-2 py-2">
                    {t.isActive ? (
                      <button
                        type="button"
                        className="text-sm text-accent hover:underline disabled:opacity-50"
                        disabled={reverseMutation.isPending}
                        onClick={() => void handleReverse(t.id)}
                      >
                        Revertir
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!hasCashDue ? (
        <p className="mt-3 text-sm text-text-muted">
          Sin usos asignados a CASH — no hay montos a transferir.
        </p>
      ) : canRegister ? (
        <div className="mt-4 rounded-lg border border-border p-4">
          <h4 className="font-medium text-text">Registrar transferencia</h4>
          <p className="mt-1 text-sm text-text-muted">
            Pagos parciales permitidos. Pendiente actual:{' '}
            {formatBenefitMoneyCents(summary.cashOutstandingCents)}
          </p>
          <div className="mt-3 grid max-w-md gap-3">
            <label className="text-sm">
              Monto (ARS, sin centavos)
              <input
                className="mt-1 w-full rounded border border-border bg-bg px-2 py-1"
                inputMode="numeric"
                value={pesos}
                onChange={(e) => setPesos(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Fecha de la transferencia
              <input
                type="date"
                className="mt-1 w-full rounded border border-border bg-bg px-2 py-1"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Referencia (opcional)
              <input
                className="mt-1 w-full rounded border border-border bg-bg px-2 py-1"
                maxLength={120}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Notas (opcional)
              <textarea
                className="mt-1 w-full rounded border border-border bg-bg px-2 py-1"
                rows={2}
                maxLength={2000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <Button disabled={registerMutation.isPending} onClick={() => void handleRegister()}>
              {registerMutation.isPending ? 'Registrando…' : 'Registrar transferencia'}
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-text-muted">Cash due transferido por completo.</p>
      )}
    </section>
  );
}
