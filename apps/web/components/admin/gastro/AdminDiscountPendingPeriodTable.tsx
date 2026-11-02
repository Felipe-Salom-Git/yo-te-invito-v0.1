'use client';

import { formatBenefitMoneyCents, type BenefitSettlementAllocationMode } from '@yo-te-invito/shared';
import { Badge, Button } from '@/components';
import { periodLabel, settlementStatusLabel } from '@/lib/gastro/discount-economic-summary-ui';
import {
  BLOCKED_REASON_LABEL,
  SETTLE_VALIDATIONS_COPY,
  selectableIds,
  type PendingPeriodGroup,
} from '@/lib/admin/discount-settlement-actions-ui';

type Props = {
  group: PendingPeriodGroup;
  selected: ReadonlySet<string>;
  disabled: boolean;
  onToggle: (validationId: string) => void;
  onToggleAll: (ids: string[], checked: boolean) => void;
  onAssign: (mode: BenefitSettlementAllocationMode) => void;
};

/** One settlement period: explicit selection of priced validations; blocked rows stay visible but disabled. */
export function AdminDiscountPendingPeriodTable({ group, selected, disabled, onToggle, onToggleAll, onAssign }: Props) {
  const ids = selectableIds(group);
  const selectedCount = ids.filter((id) => selected.has(id)).length;
  const allSelected = ids.length > 0 && selectedCount === ids.length;

  return (
    <div className="mt-4 rounded-lg border border-border bg-bg p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-text">{periodLabel(group.periodKey)}</span>
          <Badge variant="muted">
            {group.settlementStatus ? settlementStatusLabel(group.settlementStatus) : 'Sin liquidación todavía'}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={disabled || selectedCount === 0} onClick={() => onAssign('CASH')}>
            {SETTLE_VALIDATIONS_COPY.assignCash}
          </Button>
          <Button size="sm" variant="secondary" disabled={disabled || selectedCount === 0} onClick={() => onAssign('BARTER')}>
            {SETTLE_VALIDATIONS_COPY.assignBarter}
          </Button>
        </div>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="px-2 py-2">
                <input
                  type="checkbox"
                  aria-label="Seleccionar todas las validaciones liquidables del período"
                  checked={allSelected}
                  disabled={disabled || ids.length === 0}
                  onChange={(e) => onToggleAll(ids, e.target.checked)}
                />
              </th>
              <th className="px-2 py-2">Fecha</th>
              <th className="px-2 py-2">Cupón / usuario</th>
              <th className="px-2 py-2">Valor unitario</th>
              <th className="px-2 py-2">Contrato</th>
              <th className="px-2 py-2">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {group.rows.map((row) => (
              <tr key={row.validationId} className={row.allocatable ? '' : 'opacity-60'}>
                <td className="px-2 py-2">
                  <input
                    type="checkbox"
                    aria-label={`Seleccionar validación ${row.claimShortCode ?? row.validationId}`}
                    checked={row.allocatable && selected.has(row.validationId)}
                    disabled={disabled || !row.allocatable}
                    onChange={() => onToggle(row.validationId)}
                  />
                </td>
                <td className="px-2 py-2">{new Date(row.validatedAt).toLocaleString('es-AR')}</td>
                <td className="px-2 py-2">
                  <div>{row.claimShortCode ?? '—'}</div>
                  {row.claimEmail ? <div className="text-xs text-text-muted">{row.claimEmail}</div> : null}
                </td>
                <td className="px-2 py-2">
                  {row.unitPriceCents ? formatBenefitMoneyCents(row.unitPriceCents, row.currency ?? 'ARS') : '—'}
                </td>
                <td className="px-2 py-2">
                  {row.agreementId ? (
                    <span className="text-xs text-text-muted">
                      Contrato del descuento · canje ×{row.barterMultiplier}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-2 py-2">
                  {row.blockedReason ? (
                    <span className="text-xs text-amber-700 dark:text-amber-300">{BLOCKED_REASON_LABEL[row.blockedReason]}</span>
                  ) : (
                    <Badge variant="muted">Valuada</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
