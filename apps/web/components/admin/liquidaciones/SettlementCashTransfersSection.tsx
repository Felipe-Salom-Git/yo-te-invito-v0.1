'use client';

import { useState } from 'react';
import {
  BENEFIT_CASH_COLLECTION_STATUS_LABEL,
  formatBenefitMoneyCents,
  mapBenefitSettlementErrorMessage,
  type BenefitSettlementSummary,
  type BenefitSettlementTransferDto,
  type BenefitVertical,
} from '@yo-te-invito/shared';
import { Badge } from '@/components';
import {
  useAdminBenefitSettlementTransfers,
  useReverseAdminBenefitSettlementTransfer,
} from '@/lib/query/benefit-settlements';
import { ReverseTransferModal } from './ReverseTransferModal';
import { SettlementRegisterTransferForm } from './SettlementRegisterTransferForm';
import { SettlementTransfersTable } from './SettlementTransfersTable';

type Props = {
  settlementId: string;
  vertical: BenefitVertical;
  partnerDisplayName: string | null;
  summary: BenefitSettlementSummary;
};

/**
 * G7.12.4 / G10.D5 — CASH transfers. GASTRO transfers are attributed to one discount (EXACT);
 * legacy ones stay SETTLEMENT_LEVEL. Partial and multiple transfers allowed; still allowed after CLOSED.
 */
export function SettlementCashTransfersSection({ settlementId, vertical, partnerDisplayName, summary }: Props) {
  const { data } = useAdminBenefitSettlementTransfers(settlementId);
  const reverseMutation = useReverseAdminBenefitSettlementTransfer();
  const [reversing, setReversing] = useState<BenefitSettlementTransferDto | null>(null);
  const [reverseError, setReverseError] = useState<string | null>(null);

  const transfers = data?.data ?? [];
  const hasCashDue = summary.cashDueCents !== '0';
  const canRegister = hasCashDue && summary.cashOutstandingCents !== '0';

  const confirmReverse = async (reason: string) => {
    if (!reversing) return;
    setReverseError(null);
    try {
      await reverseMutation.mutateAsync({ id: settlementId, transferId: reversing.id, body: { reason } });
      setReversing(null);
    } catch (err) {
      setReverseError(mapBenefitSettlementErrorMessage(err));
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
          <dd className="mt-1 text-lg font-semibold">{formatBenefitMoneyCents(summary.cashReceivedCents)}</dd>
        </div>
        <div className="rounded-lg bg-bg-muted p-3">
          <dt className="text-xs text-text-muted">Pendiente</dt>
          <dd className="mt-1 text-lg font-semibold">{formatBenefitMoneyCents(summary.cashOutstandingCents)}</dd>
        </div>
      </dl>
      {vertical === 'GASTRO' ? (
        <p className="mt-2 text-xs text-text-muted">
          Cada pago se atribuye a un descuento (EXACT). Los pagos legacy sin descuento se muestran como
          SETTLEMENT_LEVEL y no se reparten entre descuentos.
        </p>
      ) : null}

      {transfers.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">Sin transferencias registradas.</p>
      ) : (
        <SettlementTransfersTable
          transfers={transfers}
          vertical={vertical}
          settlementLocalName={partnerDisplayName}
          reverseDisabled={reverseMutation.isPending}
          onReverse={(t) => {
            setReverseError(null);
            setReversing(t);
          }}
        />
      )}

      {!hasCashDue ? (
        <p className="mt-3 text-sm text-text-muted">Sin usos asignados a CASH — no hay montos a transferir.</p>
      ) : canRegister ? (
        <SettlementRegisterTransferForm
          settlementId={settlementId}
          vertical={vertical}
          cashOutstandingCents={summary.cashOutstandingCents}
          discountCash={data?.discountCash ?? []}
        />
      ) : (
        <p className="mt-3 text-sm text-text-muted">Cash due transferido por completo.</p>
      )}

      <ReverseTransferModal
        key={reversing?.id ?? 'none'}
        transfer={
          reversing
            ? {
                amountCents: reversing.amountCents,
                currency: reversing.currency,
                context: reversing.discountTitle ?? undefined,
              }
            : null
        }
        pending={reverseMutation.isPending}
        serverError={reverseError}
        onClose={() => setReversing(null)}
        onConfirm={(reason) => void confirmReverse(reason)}
      />
    </section>
  );
}
