'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import type { GastroDiscountCreatePayload } from '@/repositories/interfaces';
import { PageContainer, SectionTitle, useToast } from '@/components';
import { GastroDiscountForm } from '@/components/gastro/GastroDiscountForm';
import { DiscountAgreementTermsFields } from '@/components/admin/agreements/DiscountAgreementTermsFields';
import { adminGastroKeys, adminBenefitAgreementsKeys } from '@/lib/query/keys';
import { getErrorMessage } from '@/lib/errors';
import {
  buildDiscountAgreementTerms,
  emptyDiscountAgreementForm,
} from '@/lib/admin/discount-agreement-form';

export default function AdminGastroDiscountNuevoPage() {
  const params = useParams();
  const profileId = (params?.profileId as string) ?? '';
  const repos = useRepositories();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [agreementForm, setAgreementForm] = useState(emptyDiscountAgreementForm);

  const { data: location } = useQuery({
    queryKey: adminGastroKeys.detail(profileId),
    queryFn: () => repos.adminGastro.getLocation(profileId),
    enabled: !!profileId,
  });

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof repos.adminGastro.createDiscount>[1]) =>
      repos.adminGastro.createDiscount(profileId, payload),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: (created) => {
      addToast('Descuento creado y activado con su contrato comercial', 'success');
      queryClient.invalidateQueries({ queryKey: adminGastroKeys.discounts(profileId) });
      queryClient.invalidateQueries({ queryKey: adminGastroKeys.detail(profileId) });
      queryClient.invalidateQueries({ queryKey: adminBenefitAgreementsKeys.all });
      router.push(`/admin/gastronomicos/${profileId}/descuentos/${created.id}`);
    },
  });

  const handleSubmit = (payload: GastroDiscountCreatePayload) => {
    const terms = buildDiscountAgreementTerms(agreementForm);
    if (!terms.ok) {
      addToast(terms.error, 'error');
      return;
    }
    createMutation.mutate({ ...payload, agreement: terms.terms });
  };

  return (
    <PageContainer>
      <Link
        href={`/admin/gastronomicos/${profileId}`}
        className="mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        ← Volver al local
      </Link>
      <SectionTitle>Crear descuento para {location?.displayName ?? 'local'}</SectionTitle>
      <p className="mt-2 mb-6 text-sm text-text-muted">
        El descuento nace activo junto con su contrato comercial (se crean en la misma operación).
        Debe existir un local ACTIVE del tenant.
      </p>
      {location && location.status !== 'active' && (
        <p className="mb-4 text-sm text-red-300">Este local no está ACTIVE; no se puede crear un descuento público.</p>
      )}
      <section className="mb-8 rounded-xl border border-border bg-bg-muted/40 p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          Contrato comercial del descuento
        </h2>
        <p className="mt-1 mb-4 text-sm text-text-muted">
          Valor que se liquida por cada validación de este descuento y multiplicador de canje. Debe
          estar vigente hoy. Es solo de este descuento: no aplica a otros descuentos del local.
        </p>
        <DiscountAgreementTermsFields
          idPrefix="new-discount-agreement"
          value={agreementForm}
          onChange={setAgreementForm}
          disabled={createMutation.isPending}
        />
      </section>
      <GastroDiscountForm
        variant="admin"
        gastroProfileId={profileId}
        submitting={createMutation.isPending}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}
