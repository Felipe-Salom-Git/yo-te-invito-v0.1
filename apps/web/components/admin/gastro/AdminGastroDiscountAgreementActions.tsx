'use client';

import { useState } from 'react';
import { formatBenefitMoneyCents, type BenefitCommercialAgreementDto } from '@yo-te-invito/shared';
import { Button, Input, useToast } from '@/components';
import { DiscountAgreementTermsFields } from '@/components/admin/agreements/DiscountAgreementTermsFields';
import {
  useCloseAdminBenefitAgreement,
  useCreateAdminBenefitAgreement,
  useReplaceAdminBenefitAgreement,
} from '@/lib/query/benefit-agreements';
import {
  buildDiscountAgreementTerms,
  centsToPesosInput,
  emptyDiscountAgreementForm,
  todayAgreementDateKey,
  type DiscountAgreementFormState,
} from '@/lib/admin/discount-agreement-form';
import {
  canCreateDiscountAgreement,
  isDiscountAgreementClosable,
} from '@/lib/admin/discount-agreement-status';
import { getErrorMessage } from '@/lib/errors';

type Props = {
  profileId: string;
  discountId: string;
  current: BenefitCommercialAgreementDto | null;
  history: BenefitCommercialAgreementDto[];
};

type Mode = 'idle' | 'create' | 'replace' | 'close';

/**
 * G10.B — create / replace / close the contract of THIS discount. Economic terms of an existing
 * row are never edited: "Cambiar contrato" closes it and opens a new one (replace flow).
 */
export function AdminGastroDiscountAgreementActions({ profileId, discountId, current, history }: Props) {
  const { addToast } = useToast();
  const createMutation = useCreateAdminBenefitAgreement();
  const replaceMutation = useReplaceAdminBenefitAgreement();
  const closeMutation = useCloseAdminBenefitAgreement();
  const [mode, setMode] = useState<Mode>('idle');
  const [form, setForm] = useState<DiscountAgreementFormState>(emptyDiscountAgreementForm);
  const [closeDate, setCloseDate] = useState(todayAgreementDateKey);
  const busy = createMutation.isPending || replaceMutation.isPending || closeMutation.isPending;

  const replaceable = current && current.scope === 'DISCOUNT' && current.isOpen ? current : null;
  const closable = history.find(isDiscountAgreementClosable) ?? null;
  const creatable = canCreateDiscountAgreement(history);

  const run = async (action: () => Promise<unknown>, ok: string) => {
    try {
      await action();
      addToast(ok, 'success');
      setMode('idle');
    } catch (e) {
      addToast(getErrorMessage(e), 'error');
    }
  };

  const handleCreate = () => {
    const terms = buildDiscountAgreementTerms(form);
    if (!terms.ok) return addToast(terms.error, 'error');
    void run(
      () =>
        createMutation.mutateAsync({
          vertical: 'GASTRO',
          gastroProfileId: profileId,
          gastroDiscountId: discountId,
          ...terms.terms,
        }),
      'Contrato del descuento creado',
    );
  };

  const handleReplace = () => {
    if (!replaceable) return;
    const terms = buildDiscountAgreementTerms({ ...form, validTo: '' });
    if (!terms.ok) return addToast(terms.error, 'error');
    const ok = window.confirm(
      `Se cierra el contrato vigente el día anterior a ${terms.terms.validFrom} y se abre uno nuevo de ` +
        `${formatBenefitMoneyCents(terms.terms.unitPriceCents)} por validación.\n\n` +
        'Los usos ya liquidados conservan el valor anterior. Solo afecta a este descuento.\n\n¿Continuar?',
    );
    if (!ok) return;
    const { validFrom, unitPriceCents, barterMultiplier, currency, notes } = terms.terms;
    void run(
      () =>
        replaceMutation.mutateAsync({
          id: replaceable.id,
          body: { effectiveFrom: validFrom, unitPriceCents, barterMultiplier, currency, ...(notes ? { notes } : {}) },
        }),
      'Contrato del descuento reemplazado (historial preservado)',
    );
  };

  const handleClose = () => {
    if (!closable) return;
    const ok = window.confirm(
      `Cerrar el contrato con fecha fin ${closeDate}. El historial se conserva; las validaciones ` +
        'posteriores quedarán sin contrato hasta cargar uno nuevo.\n\n¿Continuar?',
    );
    if (!ok) return;
    void run(
      () => closeMutation.mutateAsync({ id: closable.id, body: { validTo: closeDate } }),
      'Contrato del descuento cerrado',
    );
  };

  if (mode === 'idle') {
    return (
      <div className="mt-4 flex flex-wrap gap-2">
        {creatable ? (
          <Button type="button" size="sm" onClick={() => { setForm(emptyDiscountAgreementForm()); setMode('create'); }}>
            Crear contrato
          </Button>
        ) : null}
        {replaceable ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              setForm({
                ...emptyDiscountAgreementForm(),
                unitPricePesos: centsToPesosInput(replaceable.unitPriceCents),
                barterMultiplier: replaceable.barterMultiplier,
              });
              setMode('replace');
            }}
          >
            Cambiar contrato
          </Button>
        ) : null}
        {closable ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => setMode('close')}>
            Cerrar contrato
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-border bg-bg p-3">
      {mode === 'close' ? (
        <Input
          id={`discount-agreement-close-${discountId}`}
          label="Fecha fin (inclusive)"
          type="date"
          value={closeDate}
          onChange={(e) => setCloseDate(e.target.value)}
        />
      ) : (
        <>
          <p className="text-xs text-text-muted">
            {mode === 'create'
              ? 'Contrato solo de este descuento. No afecta a otros descuentos del local.'
              : 'Cierra el contrato vigente y abre uno nuevo desde la fecha indicada. Los términos del contrato vigente no se editan.'}
          </p>
          <DiscountAgreementTermsFields
            idPrefix={`discount-agreement-${mode}-${discountId}`}
            value={form}
            onChange={setForm}
            showValidTo={mode === 'create'}
            fromLabel={mode === 'create' ? 'Desde' : 'Nuevo contrato desde'}
            disabled={busy}
          />
        </>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={mode === 'create' ? handleCreate : mode === 'replace' ? handleReplace : handleClose}
        >
          {mode === 'create' ? 'Guardar contrato' : mode === 'replace' ? 'Reemplazar contrato' : 'Cerrar contrato'}
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => setMode('idle')}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
