'use client';

import { formatBenefitMoneyCents, type BenefitSettlementAllocationMode } from '@yo-te-invito/shared';
import { Button, Modal } from '@/components';
import { periodLabel } from '@/lib/gastro/discount-economic-summary-ui';
import {
  MODE_LABEL,
  SETTLE_VALIDATIONS_COPY,
  previewSelection,
  type PendingPeriodGroup,
} from '@/lib/admin/discount-settlement-actions-ui';

type Props = {
  group: PendingPeriodGroup | null;
  selected: ReadonlySet<string>;
  mode: BenefitSettlementAllocationMode;
  onModeChange: (mode: BenefitSettlementAllocationMode) => void;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

/** Confirmation of a CASH / CANJE assignment. CANJE = allocation BARTER; it is never a payment. */
export function AdminDiscountAssignModal({ group, selected, mode, onModeChange, pending, error, onClose, onConfirm }: Props) {
  if (!group) return null;
  const preview = previewSelection(group, selected, mode);
  const options: Array<{ value: BenefitSettlementAllocationMode; hint: string }> = [
    { value: 'CASH', hint: SETTLE_VALIDATIONS_COPY.cashOption },
    { value: 'BARTER', hint: SETTLE_VALIDATIONS_COPY.barterOption },
  ];

  return (
    <Modal
      isOpen
      onClose={pending ? () => undefined : onClose}
      title={`${SETTLE_VALIDATIONS_COPY.title} — ${periodLabel(group.periodKey)}`}
      footer={
        <>
          <Button variant="secondary" disabled={pending} onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={pending || preview.count === 0} onClick={onConfirm}>
            {pending ? 'Asignando…' : `${SETTLE_VALIDATIONS_COPY.confirm} ${MODE_LABEL[mode]}`}
          </Button>
        </>
      }
    >
      <fieldset className="grid gap-2 text-sm">
        <legend className="mb-1 font-medium">{SETTLE_VALIDATIONS_COPY.liquidateAs}</legend>
        {options.map((option) => (
          <label key={option.value} className="flex items-start gap-2">
            <input
              type="radio"
              name="liquidate-as"
              className="mt-1"
              checked={mode === option.value}
              disabled={pending}
              onChange={() => onModeChange(option.value)}
            />
            <span>
              <span className="font-medium">{MODE_LABEL[option.value]}</span>
              <span className="block text-xs text-text-muted">{option.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded border border-border p-2">
          <dt className="text-xs text-text-muted">Validaciones seleccionadas</dt>
          <dd className="font-medium">{preview.count}</dd>
        </div>
        <div className="rounded border border-border p-2">
          <dt className="text-xs text-text-muted">Base (valor del contrato)</dt>
          <dd className="font-medium">{formatBenefitMoneyCents(preview.baseCents)}</dd>
        </div>
        {preview.creditCents != null ? (
          <div className="rounded border border-border p-2 sm:col-span-2">
            <dt className="text-xs text-text-muted">Crédito de canje estimado (base × multiplicador)</dt>
            <dd className="font-medium">{formatBenefitMoneyCents(preview.creditCents)}</dd>
          </div>
        ) : null}
      </dl>
      {!group.settlementId ? <p className="mt-3 text-xs text-text-muted">{SETTLE_VALIDATIONS_COPY.newSettlement}</p> : null}
      <p className="mt-2 text-xs text-text-muted">Los importes finales los confirma el servidor con el contrato de cada validación.</p>
      {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
    </Modal>
  );
}
