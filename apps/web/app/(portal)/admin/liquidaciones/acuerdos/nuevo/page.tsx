'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button, PageContainer, SectionTitle, useToast } from '@/components';
import { LiquidacionesSubnav } from '@/components/admin/liquidaciones/LiquidacionesSubnav';
import { DiscountAgreementTermsFields } from '@/components/admin/agreements/DiscountAgreementTermsFields';
import { useCreateAdminBenefitAgreement } from '@/lib/query/benefit-agreements';
import { useAgreementPartnerCatalog } from '@/lib/admin/use-agreement-partner-catalog';
import { resolveGastroAgreementCreateTarget } from '@/lib/admin/benefit-agreement-list';
import {
  buildDiscountAgreementTerms,
  emptyDiscountAgreementForm,
} from '@/lib/admin/discount-agreement-form';
import { getErrorMessage } from '@/lib/errors';

const SELECT = 'mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-text';

/**
 * G10.B — GASTRO: Local → Descuento → términos (never a profile-scoped contract).
 * ACTIVITY: operator → terms (unchanged).
 */
export default function AdminNewBenefitAgreementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const createMutation = useCreateAdminBenefitAgreement();
  const [vertical, setVertical] = useState<'GASTRO' | 'ACTIVITY'>('GASTRO');
  const [partnerId, setPartnerId] = useState(searchParams?.get('gastroProfileId') ?? '');
  const [discountId, setDiscountId] = useState(searchParams?.get('gastroDiscountId') ?? '');
  const [form, setForm] = useState(emptyDiscountAgreementForm);
  const catalog = useAgreementPartnerCatalog(vertical, partnerId, 'benefit-agreement-create-gastro');
  const target = resolveGastroAgreementCreateTarget(vertical, partnerId, discountId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    const terms = buildDiscountAgreementTerms(vertical === 'GASTRO' ? form : { ...form, validTo: '' });
    if (!terms.ok) return addToast(terms.error, 'error');
    try {
      await createMutation.mutateAsync({ vertical, ...target, ...terms.terms });
      addToast(vertical === 'GASTRO' ? 'Contrato del descuento creado' : 'Contrato del operador creado', 'success');
      router.push(
        vertical === 'GASTRO'
          ? `/admin/gastronomicos/${encodeURIComponent(partnerId)}/descuentos/${encodeURIComponent(discountId)}#contrato-comercial`
          : '/admin/liquidaciones/acuerdos',
      );
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    }
  };

  return (
    <PageContainer>
      <LiquidacionesSubnav />
      <Link href="/admin/liquidaciones/acuerdos" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Acuerdos
      </Link>
      <SectionTitle>Nuevo contrato comercial</SectionTitle>
      <p className="mt-2 max-w-2xl text-sm text-text-muted">
        {vertical === 'GASTRO'
          ? 'Elegí el local y el descuento: el contrato es solo de ese descuento. No se crean contratos para todo el local.'
          : 'Contrato por operador de Activity.'}
      </p>
      <form onSubmit={handleSubmit} className="mt-6 max-w-3xl space-y-4">
        <label className="block max-w-lg text-sm">
          <span className="text-text-muted">Vertical</span>
          <select
            className={SELECT}
            value={vertical}
            onChange={(e) => {
              setVertical(e.target.value as 'GASTRO' | 'ACTIVITY');
              setPartnerId('');
              setDiscountId('');
            }}
          >
            <option value="GASTRO">Gastronómico</option>
            <option value="ACTIVITY">Excursión / Activity</option>
          </select>
        </label>

        <label className="block max-w-lg text-sm">
          <span className="text-text-muted">{vertical === 'GASTRO' ? 'Local' : 'Operador'}</span>
          <select
            required
            className={SELECT}
            value={partnerId}
            onChange={(e) => {
              setPartnerId(e.target.value);
              setDiscountId('');
            }}
          >
            <option value="">Seleccionar…</option>
            {catalog.partnerOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        {vertical === 'GASTRO' ? (
          <label className="block max-w-lg text-sm">
            <span className="text-text-muted">Descuento</span>
            <select
              required
              disabled={!partnerId}
              className={SELECT}
              value={discountId}
              onChange={(e) => setDiscountId(e.target.value)}
            >
              <option value="">{partnerId ? 'Seleccionar…' : 'Elegí primero el local'}</option>
              {catalog.discountOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
            {partnerId && !catalog.discountsLoading && catalog.discountOptions.length === 0 ? (
              <span className="mt-1 block text-xs text-text-muted">Este local no tiene descuentos.</span>
            ) : null}
          </label>
        ) : null}

        <DiscountAgreementTermsFields
          idPrefix="new-agreement"
          value={form}
          onChange={setForm}
          showValidTo={vertical === 'GASTRO'}
          disabled={createMutation.isPending}
        />

        <Button type="submit" disabled={createMutation.isPending || !target}>
          {createMutation.isPending ? 'Guardando…' : 'Crear contrato'}
        </Button>
      </form>
    </PageContainer>
  );
}
