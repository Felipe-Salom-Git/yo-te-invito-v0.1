'use client';

import { useMemo, useState } from 'react';
import {
  formatBarterMultiplierLabel,
  formatBenefitMoneyCents,
  groupPendingValidationsByBenefit,
  mapBenefitSettlementErrorMessage,
  previewAllocationSelection,
  type BenefitSettlementAllocationMode,
} from '@yo-te-invito/shared';
import { Button } from '@/components';
import { Modal } from '@/components/ui/Modal';
import {
  useAdminBenefitSettlementPendingValidations,
  useAllocateAdminBenefitSettlement,
} from '@/lib/query/benefit-settlements';

type Props = {
  settlementId: string;
  /** Discount/coupon to list first (contextual entry). Grouping only. */
  focusBenefitId?: string | null;
};

const MODE_LABEL: Record<BenefitSettlementAllocationMode, string> = {
  CASH: 'CASH — transferencia',
  BARTER: 'BARTER — canje',
};

/** G7.12.2/3 — pending validations (partner + period) with explicit CASH/BARTER selection. */
export function SettlementPendingValidationsSection({ settlementId, focusBenefitId }: Props) {
  const { data, isLoading, isError } = useAdminBenefitSettlementPendingValidations(settlementId);
  const allocateMutation = useAllocateAdminBenefitSettlement();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmMode, setConfirmMode] = useState<BenefitSettlementAllocationMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const items = data?.data ?? [];
  const groups = useMemo(
    () => groupPendingValidationsByBenefit(items, focusBenefitId),
    [items, focusBenefitId],
  );
  const selectedItems = items.filter((v) => selected.has(v.validationId));
  const preview = confirmMode ? previewAllocationSelection(selectedItems, confirmMode) : null;
  const multipliers = [
    ...new Set(selectedItems.map((v) => formatBarterMultiplierLabel(v.barterMultiplier))),
  ];

  const toggle = (ids: string[], on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const confirm = async () => {
    if (!confirmMode) return;
    setError(null);
    try {
      await allocateMutation.mutateAsync({
        id: settlementId,
        body: { mode: confirmMode, validationIds: selectedItems.map((v) => v.validationId) },
      });
      setSelected(new Set());
      setConfirmMode(null);
    } catch (err) {
      setError(mapBenefitSettlementErrorMessage(err));
      setConfirmMode(null);
    }
  };

  if (isLoading) {
    return <p className="mt-8 text-sm text-text-muted">Cargando usos pendientes…</p>;
  }
  if (isError || !data) {
    return <p className="mt-8 text-sm text-red-500">No se pudieron cargar los usos pendientes.</p>;
  }

  return (
    <section className="mt-8 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-text">Usos pendientes de asignar</h3>
          <p className="mt-1 max-w-2xl text-sm text-text-muted">
            Validaciones del partner en el período sin asignación económica. El valor sale del
            acuerdo vigente a la fecha de cada validación. Podés repartir entre CASH y BARTER.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={selectedItems.length === 0 || allocateMutation.isPending}
            onClick={() => setConfirmMode('CASH')}
          >
            Asignar {selectedItems.length || ''} a CASH
          </Button>
          <Button
            variant="secondary"
            disabled={selectedItems.length === 0 || allocateMutation.isPending}
            onClick={() => setConfirmMode('BARTER')}
          >
            Asignar {selectedItems.length || ''} a BARTER
          </Button>
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
      {data.missingAgreementCount > 0 ? (
        <p className="mt-2 rounded border border-amber-500/40 bg-amber-500/10 p-2 text-sm">
          {data.missingAgreementCount} validación(es) sin acuerdo comercial aplicable — no se pueden
          asignar hasta cargar el acuerdo.
        </p>
      ) : null}
      {groups.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">No hay usos pendientes.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {groups.map((group) => {
            const ids = group.items.map((v) => v.validationId);
            const allOn = ids.every((id) => selected.has(id));
            return (
              <div key={group.benefitId} className="overflow-x-auto">
                <label className="flex items-center gap-2 text-sm font-medium text-text">
                  <input
                    type="checkbox"
                    checked={allOn}
                    onChange={(e) => toggle(ids, e.target.checked)}
                  />
                  {group.benefitTitle}
                  {group.benefitId === focusBenefitId ? (
                    <span className="text-xs text-accent">(descuento de origen)</span>
                  ) : null}
                  <span className="text-xs font-normal text-text-muted">
                    {group.items.length} uso(s) · {formatBenefitMoneyCents(group.baseAmountCents)}
                  </span>
                </label>
                <table className="mt-2 min-w-full text-left text-xs">
                  <thead>
                    <tr className="text-text-muted">
                      <th className="px-1 py-1" />
                      <th className="px-1 py-1">Fecha</th>
                      <th className="px-1 py-1">Código</th>
                      <th className="px-1 py-1">Valor (acuerdo)</th>
                      <th className="px-1 py-1">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((v) => (
                      <tr key={v.validationId} className="border-t border-border/50">
                        <td className="px-1 py-1">
                          <input
                            type="checkbox"
                            aria-label={`Seleccionar uso ${v.shortCode ?? v.validationId}`}
                            checked={selected.has(v.validationId)}
                            onChange={(e) => toggle([v.validationId], e.target.checked)}
                          />
                        </td>
                        <td className="px-1 py-1">
                          {new Date(v.validatedAt).toLocaleString('es-AR')}
                        </td>
                        <td className="px-1 py-1 font-mono">{v.shortCode ?? '—'}</td>
                        <td className="px-1 py-1">
                          {formatBenefitMoneyCents(v.unitPriceCents, v.currency)}
                        </td>
                        <td className="px-1 py-1 text-text-muted">Pendiente</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={confirmMode != null}
        onClose={() => setConfirmMode(null)}
        title={confirmMode ? `Asignar a ${MODE_LABEL[confirmMode]}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmMode(null)}>
              Cancelar
            </Button>
            <Button disabled={allocateMutation.isPending} onClick={() => void confirm()}>
              {allocateMutation.isPending ? 'Asignando…' : 'Confirmar'}
            </Button>
          </>
        }
      >
        {preview && confirmMode ? (
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-muted">Cantidad</dt>
              <dd>{preview.count}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Valor unitario</dt>
              <dd>{preview.unitPrices.map((u) => formatBenefitMoneyCents(u)).join(' / ')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Base</dt>
              <dd className="font-semibold">{formatBenefitMoneyCents(preview.baseAmountCents)}</dd>
            </div>
            {confirmMode === 'BARTER' ? (
              <>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Multiplicador</dt>
                  <dd>{multipliers.join(' / ')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Crédito estimado</dt>
                  <dd className="font-semibold">
                    {formatBenefitMoneyCents(preview.creditExpectedCents)}
                  </dd>
                </div>
                <p className="pt-2 text-xs text-text-muted">
                  Crédito de canje ≠ dinero recibido. El crédito final lo confirma el backend.
                </p>
              </>
            ) : (
              <p className="pt-2 text-xs text-text-muted">
                Suma al monto a transferir (cash due) de la liquidación.
              </p>
            )}
          </dl>
        ) : null}
      </Modal>
    </section>
  );
}
