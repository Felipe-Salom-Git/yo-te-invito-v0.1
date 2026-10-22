'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { mapBenefitSettlementErrorMessage } from '@yo-te-invito/shared';
import { Button } from '@/components';
import { AdminGastroDiscountCommercialContextPanel } from '@/components/admin/gastro/AdminGastroDiscountCommercialContextPanel';
import { useGenerateAdminBenefitSettlement } from '@/lib/query/benefit-settlements';
import { resolveSettlementPartnerOptions } from '@/lib/admin/settlement-partner-options';
import {
  buildSettlementGenerateBody,
  resolveGeneratePartnerOptions,
  type SettlementGenerateContext,
} from '@/lib/admin/settlement-generate-context';

type Props = {
  context: SettlementGenerateContext;
  initialPeriodKey: string;
  gastroRows: Array<{ id: string; displayName: string }> | undefined;
  operatorRows: Array<{ id: string; name: string }> | undefined;
  gastroLoading: boolean;
  operatorsLoading: boolean;
  catalogError: boolean;
  onVerticalChange: (vertical: 'GASTRO' | 'ACTIVITY') => void;
  onClose: () => void;
};

export function SettlementGeneratePanel({
  context,
  initialPeriodKey,
  gastroRows,
  operatorRows,
  gastroLoading,
  operatorsLoading,
  catalogError,
  onVerticalChange,
  onClose,
}: Props) {
  const generateMutation = useGenerateAdminBenefitSettlement();
  const [genVertical, setGenVertical] = useState<'GASTRO' | 'ACTIVITY'>(context.vertical);
  const [genPartnerId, setGenPartnerId] = useState(context.partnerId);
  const [genPeriod, setGenPeriod] = useState(initialPeriodKey);
  const [genError, setGenError] = useState<string | null>(null);

  const partnerOptions = useMemo(
    () =>
      resolveGeneratePartnerOptions(
        resolveSettlementPartnerOptions(genVertical, gastroRows, operatorRows),
        context,
      ),
    [genVertical, gastroRows, operatorRows, context],
  );
  const catalogLoading = gastroLoading || (genVertical === 'ACTIVITY' && operatorsLoading);

  const handleGenerate = async () => {
    setGenError(null);
    if (!genPartnerId) {
      setGenError('Seleccioná un partner.');
      return;
    }
    try {
      const result = await generateMutation.mutateAsync(
        buildSettlementGenerateBody(genVertical, genPartnerId, genPeriod),
      );
      onClose();
      window.location.href = `/admin/liquidaciones/${result.id}`;
    } catch (err) {
      setGenError(mapBenefitSettlementErrorMessage(err));
    }
  };

  return (
    <div className="mt-6 rounded-lg border border-border bg-bg-muted p-4">
      <h3 className="font-medium text-text">Generar liquidación</h3>
      {context.locked && context.fromDiscountId ? (
        <p className="mt-2 max-w-2xl text-sm text-text-muted">
          Iniciada desde un descuento. La liquidación es del local y del período: incluye los usos
          validados de todos sus descuentos. Al confirmar se abre con los usos elegibles para
          asignarlos a CASH o BARTER (podés repartirlos).{' '}
          <Link
            href={`/admin/gastronomicos/${encodeURIComponent(context.partnerId)}/descuentos/${encodeURIComponent(context.fromDiscountId)}`}
            className="text-accent hover:underline"
          >
            Volver al descuento
          </Link>
        </p>
      ) : null}
      <div className="mt-4 grid max-w-lg gap-3">
        <label className="text-sm">
          Vertical
          <select
            className="mt-1 w-full rounded border border-border bg-bg px-2 py-1 disabled:opacity-70"
            value={genVertical}
            disabled={context.locked}
            onChange={(e) => {
              const next = e.target.value as 'GASTRO' | 'ACTIVITY';
              setGenVertical(next);
              setGenPartnerId('');
              onVerticalChange(next);
            }}
          >
            <option value="GASTRO">Gastronómico</option>
            <option value="ACTIVITY">Activity</option>
          </select>
        </label>
        <label className="text-sm">
          Partner
          <select
            className="mt-1 w-full rounded border border-border bg-bg px-2 py-1 disabled:opacity-70"
            value={genPartnerId}
            disabled={context.locked}
            onChange={(e) => setGenPartnerId(e.target.value)}
          >
            {context.locked ? null : <option value="">Seleccionar…</option>}
            {partnerOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          {catalogError ? (
            <p className="mt-1 text-xs text-red-500">No se pudo cargar el catálogo de partners.</p>
          ) : null}
          {!catalogLoading && partnerOptions.length === 0 ? (
            <p className="mt-1 text-xs text-text-muted">
              {genVertical === 'GASTRO'
                ? 'No hay locales activos en este tenant.'
                : 'No hay operadores activos en este tenant.'}
            </p>
          ) : null}
        </label>
        <label className="text-sm">
          Período
          <input
            type="month"
            className="mt-1 w-full rounded border border-border bg-bg px-2 py-1"
            value={genPeriod}
            onChange={(e) => setGenPeriod(e.target.value)}
          />
        </label>
        {genError ? (
          <p className="text-sm text-red-500">
            {genError}
            {genError.includes('acuerdo') ? (
              <>
                {' '}
                <Link href="/admin/liquidaciones/acuerdos" className="underline">
                  Ver acuerdos
                </Link>
              </>
            ) : null}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button disabled={generateMutation.isPending} onClick={handleGenerate}>
            {generateMutation.isPending ? 'Generando…' : 'Confirmar'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>

      {genVertical === 'GASTRO' && genPartnerId ? (
        <AdminGastroDiscountCommercialContextPanel profileId={genPartnerId} allowManage={false} />
      ) : null}
    </div>
  );
}
