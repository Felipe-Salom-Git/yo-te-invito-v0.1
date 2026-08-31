'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, PageContainer, SectionTitle } from '@/components';
import { LiquidacionesSubnav } from '@/components/admin/liquidaciones/LiquidacionesSubnav';
import { useCreateAdminBenefitAgreement } from '@/lib/query/benefit-agreements';
import { useAdminGastroLocationsList } from '@/lib/query/admin-gastro';
import { useRepositories } from '@/repositories/context';

const TENANT_ID = 'tenant-demo';

function pesosInputToCentsString(pesos: string): string {
  const digits = pesos.replace(/\D/g, '');
  if (!digits) return '0';
  return (BigInt(digits) * BigInt(100)).toString();
}

export default function AdminNewBenefitAgreementPage() {
  const router = useRouter();
  const repos = useRepositories();
  const createMutation = useCreateAdminBenefitAgreement();
  const [vertical, setVertical] = useState<'GASTRO' | 'ACTIVITY'>('GASTRO');
  const [partnerId, setPartnerId] = useState('');
  const [unitPricePesos, setUnitPricePesos] = useState('5000');
  const [barterMultiplier, setBarterMultiplier] = useState('2');
  const [validFrom, setValidFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const gastroQuery = useAdminGastroLocationsList(
    { status: 'ACTIVE', page: 1, limit: 100 },
    'benefit-agreement-create-gastro',
  );
  const operatorsQuery = useQuery({
    queryKey: ['excursion-operators', 'admin-list', TENANT_ID],
    queryFn: () =>
      repos.excursionOperators.listAdmin({ tenantId: TENANT_ID, includeInactive: false }),
    enabled: vertical === 'ACTIVITY',
  });

  const partnerOptions = useMemo(() => {
    if (vertical === 'GASTRO') {
      return (gastroQuery.data?.data ?? []).map((p) => ({
        id: p.id,
        label: p.displayName,
      }));
    }
    return (operatorsQuery.data?.data ?? []).map((p) => ({
      id: p.id,
      label: p.name,
    }));
  }, [vertical, gastroQuery.data, operatorsQuery.data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const unitPriceCents = pesosInputToCentsString(unitPricePesos);
    if (unitPriceCents === '0') return;
    await createMutation.mutateAsync({
      vertical,
      ...(vertical === 'GASTRO'
        ? { gastroProfileId: partnerId }
        : { excursionOperatorId: partnerId }),
      unitPriceCents,
      barterMultiplier,
      currency: 'ARS',
      validFrom,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    });
    router.push('/admin/liquidaciones/acuerdos');
  };

  return (
    <PageContainer>
      <LiquidacionesSubnav />
      <Link
        href="/admin/liquidaciones/acuerdos"
        className="mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        ← Acuerdos
      </Link>
      <SectionTitle>Nuevo acuerdo comercial</SectionTitle>
      <form onSubmit={handleSubmit} className="mt-6 max-w-lg space-y-4">
        <label className="block text-sm">
          <span className="text-text-muted">Vertical</span>
          <select
            className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-text"
            value={vertical}
            onChange={(e) => {
              setVertical(e.target.value as 'GASTRO' | 'ACTIVITY');
              setPartnerId('');
            }}
          >
            <option value="GASTRO">Gastronómico</option>
            <option value="ACTIVITY">Excursión / Activity</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-text-muted">Partner</span>
          <select
            required
            className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-text"
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
          >
            <option value="">Seleccionar…</option>
            {partnerOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-text-muted">Precio por uso (ARS, pesos)</span>
          <input
            required
            className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-text"
            value={unitPricePesos}
            onChange={(e) => setUnitPricePesos(e.target.value)}
            inputMode="numeric"
          />
        </label>

        <label className="block text-sm">
          <span className="text-text-muted">Multiplicador canje (sugerido 2.0)</span>
          <input
            required
            className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-text"
            value={barterMultiplier}
            onChange={(e) => setBarterMultiplier(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="text-text-muted">Vigente desde (YYYY-MM-DD, AR)</span>
          <input
            required
            type="date"
            className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-text"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="text-text-muted">Notas (opcional)</span>
          <textarea
            className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-text"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        {createMutation.isError ? (
          <p className="text-sm text-red-400">No se pudo crear el acuerdo. Revisá solapamientos y partner.</p>
        ) : null}

        <Button type="submit" disabled={createMutation.isPending || !partnerId}>
          {createMutation.isPending ? 'Guardando…' : 'Crear acuerdo'}
        </Button>
      </form>
    </PageContainer>
  );
}
