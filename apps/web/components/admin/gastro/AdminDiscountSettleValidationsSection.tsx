'use client';

import { useState } from 'react';
import { mapBenefitSettlementErrorMessage, type BenefitSettlementAllocationMode } from '@yo-te-invito/shared';
import { useToast } from '@/components';
import { EconomicBlock, EmptyLine, Hint } from '@/components/gastro/economic-summary/EconomicSummaryPrimitives';
import {
  MODE_LABEL,
  SETTLE_VALIDATIONS_COPY,
  buildDiscountAssignmentRequest,
  groupPendingByPeriod,
  type PendingPeriodGroup,
} from '@/lib/admin/discount-settlement-actions-ui';
import {
  useAdminDiscountPendingValidations,
  useAssignDiscountValidations,
} from '@/lib/query/gastro-discount-settlement-actions';
import { AdminDiscountPendingPeriodTable } from './AdminDiscountPendingPeriodTable';
import { AdminDiscountAssignModal } from './AdminDiscountAssignModal';

/**
 * G10.D3 — "Liquidar validaciones": explicit selection per period → CASH or CANJE (allocation only).
 * Funded courtesies are not billable: no CASH / CANJE action is offered.
 */
export function AdminDiscountSettleValidationsSection({ profileId, discountId }: { profileId: string; discountId: string }) {
  const { addToast } = useToast();
  const query = useAdminDiscountPendingValidations(profileId, discountId);
  const assign = useAssignDiscountValidations(profileId);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [modalGroup, setModalGroup] = useState<PendingPeriodGroup | null>(null);
  const [mode, setMode] = useState<BenefitSettlementAllocationMode>('CASH');
  const [error, setError] = useState<string | null>(null);

  if (query.isLoading) return <p className="mt-6 text-sm text-text-muted">Cargando validaciones pendientes…</p>;
  if (query.isError || !query.data) {
    return <p className="mt-6 text-sm text-text-muted">No se pudieron cargar las validaciones pendientes.</p>;
  }

  if (!query.data.billable) {
    return (
      <EconomicBlock title={SETTLE_VALIDATIONS_COPY.title}>
        <EmptyLine>{SETTLE_VALIDATIONS_COPY.fundedCourtesy}</EmptyLine>
      </EconomicBlock>
    );
  }

  const groups = groupPendingByPeriod(query.data.data);
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = (ids: string[], checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const confirm = async () => {
    if (!modalGroup) return;
    const request = buildDiscountAssignmentRequest(modalGroup, selected, mode, discountId);
    if (!request) return;
    setError(null);
    try {
      const result = await assign.mutateAsync(request);
      addToast(`${result.allocations.length} validación(es) liquidadas como ${MODE_LABEL[mode]}`, 'success');
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of request.body.validationIds ?? []) next.delete(id);
        return next;
      });
      setModalGroup(null);
    } catch (err) {
      setError(mapBenefitSettlementErrorMessage(err));
    }
  };

  return (
    <EconomicBlock title={SETTLE_VALIDATIONS_COPY.title}>
      <Hint>{SETTLE_VALIDATIONS_COPY.intro}</Hint>
      {groups.length === 0 ? (
        <EmptyLine>{SETTLE_VALIDATIONS_COPY.noPending}</EmptyLine>
      ) : (
        groups.map((group) => (
          <AdminDiscountPendingPeriodTable
            key={group.periodKey}
            group={group}
            selected={selected}
            disabled={assign.isPending}
            onToggle={toggle}
            onToggleAll={toggleAll}
            onAssign={(nextMode) => {
              setMode(nextMode);
              setError(null);
              setModalGroup(group);
            }}
          />
        ))
      )}
      <AdminDiscountAssignModal
        group={modalGroup}
        selected={selected}
        mode={mode}
        onModeChange={setMode}
        pending={assign.isPending}
        error={error}
        onClose={() => setModalGroup(null)}
        onConfirm={() => void confirm()}
      />
    </EconomicBlock>
  );
}
