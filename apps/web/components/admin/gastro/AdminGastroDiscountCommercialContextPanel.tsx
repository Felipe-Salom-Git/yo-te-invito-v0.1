'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatBenefitMoneyCents, type BenefitCommercialAgreementDto } from '@yo-te-invito/shared';
import { Button, Input, useToast } from '@/components';
import {
  useAdminBenefitAgreementPartnerHistory,
  useCreateAdminBenefitAgreement,
  useReplaceAdminBenefitAgreement,
} from '@/lib/query/benefit-agreements';
import { BENEFIT_AGREEMENT_VIGENCY_LABEL } from '@/lib/admin/benefit-agreement-labels';
import { getErrorMessage } from '@/lib/errors';

type Props = {
  profileId: string;
  partnerDisplayName?: string | null;
  /** When true, show create/replace controls (approval / moderation context). */
  allowManage?: boolean;
};

function pesosInputToCentsString(pesos: string): string {
  const digits = pesos.replace(/\D/g, '');
  if (!digits) return '0';
  return (BigInt(digits) * BigInt(100)).toString();
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function VigencyLine({ agreement }: { agreement: BenefitCommercialAgreementDto }) {
  const to = agreement.validTo ? ` → ${agreement.validTo}` : ' → abierto';
  return (
    <span>
      {agreement.validFrom}
      {to} · {BENEFIT_AGREEMENT_VIGENCY_LABEL[agreement.vigency]}
    </span>
  );
}

/**
 * Commercial context for discount approval — scoped to GastroProfile (partner), not the discount.
 */
export function AdminGastroDiscountCommercialContextPanel({
  profileId,
  partnerDisplayName,
  allowManage = true,
}: Props) {
  const { addToast } = useToast();
  const historyQuery = useAdminBenefitAgreementPartnerHistory({
    vertical: 'GASTRO',
    gastroProfileId: profileId,
  });
  const createMutation = useCreateAdminBenefitAgreement();
  const replaceMutation = useReplaceAdminBenefitAgreement();

  const [unitPricePesos, setUnitPricePesos] = useState('5000');
  const [barterMultiplier, setBarterMultiplier] = useState('2');
  const [validFrom, setValidFrom] = useState(todayKey);
  const [effectiveFrom, setEffectiveFrom] = useState(todayKey);
  const [showCreate, setShowCreate] = useState(false);
  const [showReplace, setShowReplace] = useState(false);

  const current = historyQuery.data?.current ?? null;
  const name =
    partnerDisplayName?.trim() ||
    historyQuery.data?.partnerDisplayName?.trim() ||
    'este local';
  const busy = createMutation.isPending || replaceMutation.isPending;

  const handleCreate = async () => {
    const unitPriceCents = pesosInputToCentsString(unitPricePesos);
    if (unitPriceCents === '0') {
      addToast('Ingresá un valor por ticket válido', 'error');
      return;
    }
    const ok = window.confirm(
      `Vas a crear un acuerdo comercial del partner «${name}», no solo de este descuento.\n\nAfecta liquidaciones futuras de todos los descuentos del local.\n\n¿Continuar?`,
    );
    if (!ok) return;
    try {
      await createMutation.mutateAsync({
        vertical: 'GASTRO',
        gastroProfileId: profileId,
        unitPriceCents,
        barterMultiplier,
        currency: 'ARS',
        validFrom,
      });
      addToast('Acuerdo comercial del local creado', 'success');
      setShowCreate(false);
    } catch (e) {
      addToast(getErrorMessage(e), 'error');
    }
  };

  const handleReplace = async () => {
    if (!current?.isOpen) return;
    const unitPriceCents = pesosInputToCentsString(unitPricePesos);
    if (unitPriceCents === '0') {
      addToast('Ingresá un valor por ticket válido', 'error');
      return;
    }
    const ok = window.confirm(
      `Reemplazar la tarifa cierra el acuerdo vigente del partner «${name}» y crea uno nuevo.\n\n` +
        `Las allocations históricas conservan el snapshot anterior.\n` +
        `Solo las nuevas allocations usarán ${formatBenefitMoneyCents(unitPriceCents)} / uso.\n\n` +
        `Esto NO es una propiedad del descuento que estás revisando.\n\n¿Continuar?`,
    );
    if (!ok) return;
    try {
      await replaceMutation.mutateAsync({
        id: current.id,
        body: {
          effectiveFrom,
          unitPriceCents,
          barterMultiplier,
          currency: 'ARS',
        },
      });
      addToast('Tarifa del local reemplazada (histórico preservado)', 'success');
      setShowReplace(false);
    } catch (e) {
      addToast(getErrorMessage(e), 'error');
    }
  };

  return (
    <section className="mt-8 rounded-xl border border-border bg-bg-muted/40 p-4 sm:p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
        Acuerdo comercial del local
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        El acuerdo pertenece a <span className="font-medium text-text">{name}</span> (partner), no al
        descuento individual. Cambiar la tarifa afecta futuras allocations de todos los descuentos
        del local; las allocations históricas conservan su snapshot.
      </p>

      {historyQuery.isLoading ? (
        <p className="mt-4 text-sm text-text-muted">Cargando acuerdo vigente…</p>
      ) : historyQuery.isError ? (
        <p className="mt-4 text-sm text-red-600">No se pudo cargar el acuerdo comercial.</p>
      ) : current ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <dt className="text-text-muted">Valor por ticket</dt>
            <dd className="mt-0.5 font-medium text-text">
              {formatBenefitMoneyCents(current.unitPriceCents, current.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">Multiplicador de canje</dt>
            <dd className="mt-0.5 font-medium text-text">×{current.barterMultiplier}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Moneda</dt>
            <dd className="mt-0.5 font-medium text-text">{current.currency}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Vigencia</dt>
            <dd className="mt-0.5 font-medium text-text">
              <VigencyLine agreement={current} />
            </dd>
          </div>
        </dl>
      ) : (
        <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <p className="font-medium text-text">Sin acuerdo comercial vigente</p>
          <p className="mt-1 text-text-muted">
            Este local no tiene un acuerdo aplicable hoy. Sin tarifa vigente no se pueden liquidar
            usos validados.
          </p>
        </div>
      )}

      {allowManage ? (
        <div className="mt-4 space-y-3">
          {!current ? (
            <>
              {!showCreate ? (
                <Button type="button" size="sm" onClick={() => setShowCreate(true)}>
                  Crear acuerdo del local
                </Button>
              ) : (
                <div className="rounded-lg border border-border bg-bg p-3 space-y-3">
                  <p className="text-xs text-text-muted">
                    Creás un acuerdo del partner «{name}». No queda atado a este descuento.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input
                      label="Valor por ticket (pesos ARS)"
                      value={unitPricePesos}
                      onChange={(e) => setUnitPricePesos(e.target.value)}
                    />
                    <Input
                      label="Multiplicador canje"
                      value={barterMultiplier}
                      onChange={(e) => setBarterMultiplier(e.target.value)}
                    />
                    <Input
                      label="Vigente desde"
                      type="date"
                      value={validFrom}
                      onChange={(e) => setValidFrom(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" disabled={busy} onClick={() => void handleCreate()}>
                      Confirmar acuerdo del local
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => setShowCreate(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : current.isOpen ? (
            <>
              {!showReplace ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setUnitPricePesos(
                      String(Number(BigInt(current.unitPriceCents) / BigInt(100))),
                    );
                    setBarterMultiplier(current.barterMultiplier);
                    setEffectiveFrom(todayKey());
                    setShowReplace(true);
                  }}
                >
                  Cambiar tarifa del local
                </Button>
              ) : (
                <div className="rounded-lg border border-border bg-bg p-3 space-y-3">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Cierra el acuerdo vigente del partner y abre uno nuevo. Histórico de allocations
                    intacto. Impacta todos los descuentos de «{name}».
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input
                      label="Nuevo valor (pesos ARS)"
                      value={unitPricePesos}
                      onChange={(e) => setUnitPricePesos(e.target.value)}
                    />
                    <Input
                      label="Multiplicador canje"
                      value={barterMultiplier}
                      onChange={(e) => setBarterMultiplier(e.target.value)}
                    />
                    <Input
                      label="Nueva vigencia desde"
                      type="date"
                      value={effectiveFrom}
                      onChange={(e) => setEffectiveFrom(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() => void handleReplace()}
                    >
                      Reemplazar tarifa del partner
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => setShowReplace(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      ) : null}

      <p className="mt-4 text-xs text-text-muted">
        Gestión completa:{' '}
        <Link href="/admin/liquidaciones/acuerdos" className="text-accent hover:underline">
          Liquidaciones → Acuerdos
        </Link>
      </p>
    </section>
  );
}
