'use client';

import { useState, type ReactNode } from 'react';
import {
  mapBenefitSettlementErrorMessage,
  type GastroDiscountEconomicSummary,
  type GastroDiscountEconomicSummaryAdmin,
} from '@yo-te-invito/shared';
import { Button, useToast } from '@/components';
import { ReverseTransferModal } from '@/components/admin/liquidaciones/ReverseTransferModal';
import { periodLabel } from '@/lib/gastro/discount-economic-summary-ui';
import { DISCOUNT_PAYMENT_COPY, payableSettlementOptions } from '@/lib/admin/discount-settlement-actions-ui';
import { useReverseDiscountPayment } from '@/lib/query/gastro-discount-settlement-actions';
import { AdminDiscountRegisterPaymentModal } from './AdminDiscountRegisterPaymentModal';

type Payment = GastroDiscountEconomicSummary['payments'][number];

/**
 * G10.D4 — ADMIN slots for the payments block: «Registrar pago» (aside), «Revertir pago» (per active row)
 * and their modals. Only CASH is payable; CANJE never appears here.
 */
export function useDiscountPaymentActions(summary: GastroDiscountEconomicSummaryAdmin): {
  aside: ReactNode;
  rowAction: (payment: Payment) => ReactNode;
  modals: ReactNode;
} {
  const { addToast } = useToast();
  const reverse = useReverseDiscountPayment();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [reversing, setReversing] = useState<Payment | null>(null);
  const [reverseError, setReverseError] = useState<string | null>(null);
  const options = payableSettlementOptions(summary.settlements);

  const confirmReverse = async (reason: string) => {
    if (!reversing) return;
    setReverseError(null);
    try {
      await reverse.mutateAsync({ settlementId: reversing.settlementId, transferId: reversing.transferId, body: { reason } });
      addToast('Pago revertido', 'success');
      setReversing(null);
    } catch (err) {
      setReverseError(mapBenefitSettlementErrorMessage(err));
    }
  };

  const aside = (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" disabled={options.length === 0} onClick={() => setRegisterOpen(true)}>
        {DISCOUNT_PAYMENT_COPY.register}
      </Button>
      {options.length === 0 ? <span className="text-[11px] text-text-muted">{DISCOUNT_PAYMENT_COPY.noPayable}</span> : null}
    </div>
  );

  const rowAction = (payment: Payment) =>
    payment.isActive ? (
      <button
        type="button"
        className="mt-1 text-xs text-accent hover:underline disabled:opacity-50"
        disabled={reverse.isPending}
        onClick={() => {
          setReverseError(null);
          setReversing(payment);
        }}
      >
        {DISCOUNT_PAYMENT_COPY.reverse}
      </button>
    ) : null;

  const modals = (
    <>
      {registerOpen ? (
        <AdminDiscountRegisterPaymentModal
          discountId={summary.discount.id}
          options={options}
          onClose={() => setRegisterOpen(false)}
        />
      ) : null}
      <ReverseTransferModal
        key={reversing?.transferId ?? 'none'}
        transfer={
          reversing
            ? {
                amountCents: reversing.amountCents,
                currency: reversing.currency,
                context: `${periodLabel(reversing.periodKey)}${reversing.reference ? ` · ref. ${reversing.reference}` : ''}`,
              }
            : null
        }
        pending={reverse.isPending}
        serverError={reverseError}
        onClose={() => setReversing(null)}
        onConfirm={(reason) => void confirmReverse(reason)}
      />
    </>
  );

  return { aside, rowAction, modals };
}
