'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { formatBenefitMoneyCents } from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { adminGastroKeys } from '@/lib/query/keys';
import { PageContainer, SectionTitle } from '@/components';

function parseEmails(raw: string): string[] {
  return [...new Set(raw.split(/[,;\n]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
}

function pesosToCentsInput(pesos: string): string {
  const normalized = pesos.replace(/[^\d]/g, '');
  if (!normalized) return '';
  return (BigInt(normalized) * BigInt(100)).toString();
}

export default function AdminGastroCourtesyFundingPage() {
  const params = useParams();
  const profileId = (params?.profileId as string) ?? '';
  const repos = useRepositories();

  const { data: location } = useQuery({
    queryKey: adminGastroKeys.detail(profileId),
    queryFn: () => repos.adminGastro.getLocation(profileId),
    enabled: !!profileId,
  });

  const { data: balance } = useQuery({
    queryKey: ['admin', 'courtesy-balance', profileId],
    queryFn: () => repos.adminGastro.getCourtesyCreditBalance(profileId),
    enabled: !!profileId,
  });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discountLabel, setDiscountLabel] = useState('');
  const [validTo, setValidTo] = useState('');
  const [manualEmailsRaw, setManualEmailsRaw] = useState('');
  const [sendToFollowers, setSendToFollowers] = useState(false);
  const [message, setMessage] = useState('');
  const [imputedPesos, setImputedPesos] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<import('@yo-te-invito/shared').GastroCourtesySendResponse | null>(
    null,
  );

  const manualEmails = useMemo(() => parseEmails(manualEmailsRaw), [manualEmailsRaw]);
  const imputedValueCents = useMemo(() => pesosToCentsInput(imputedPesos), [imputedPesos]);
  const availableCents = balance?.balanceAvailableCents ?? '0';
  const remainingCents = useMemo(() => {
    if (!imputedValueCents) return availableCents;
    try {
      const rem = BigInt(availableCents) - BigInt(imputedValueCents);
      return rem.toString();
    } catch {
      return availableCents;
    }
  }, [availableCents, imputedValueCents]);

  const sendMutation = useMutation({
    mutationFn: () =>
      repos.adminGastro.sendFundedCourtesy({
        gastroProfileId: profileId,
        title: title.trim(),
        description: description.trim() || undefined,
        discountLabel: discountLabel.trim(),
        validTo: new Date(validTo).toISOString(),
        manualEmails,
        sendToFollowers,
        message: message.trim() || undefined,
        funding: {
          source: 'COURTESY_CREDIT',
          imputedValueCents,
        },
      }),
    onSuccess: (data) => {
      setResult(data);
      setError(null);
    },
    onError: (err: Error) => setError(err.message || 'No se pudo crear la cortesía financiada'),
  });

  if (!location) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando local…</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <Link href={`/admin/gastronomicos/${profileId}`} className="text-primary hover:underline">
          ← {location.displayName}
        </Link>
      </div>

      <SectionTitle>Cortesía financiada con canje</SectionTitle>
      <p className="mb-6 text-sm text-text-muted">
        Admin — consume saldo de canje del local al crear la campaña
      </p>

      {balance && (
        <div className="mb-6 rounded-lg border border-border bg-surface p-4 text-sm">
          <p>
            <strong>Saldo de canje disponible:</strong>{' '}
            {formatBenefitMoneyCents(balance.balanceAvailableCents)}
          </p>
          <p className="text-text-muted">
            Generado: {formatBenefitMoneyCents(balance.creditGeneratedCents)} · Consumido:{' '}
            {formatBenefitMoneyCents(balance.creditConsumedCents)}
          </p>
          {imputedValueCents && (
            <p>
              <strong>Saldo restante (preview):</strong>{' '}
              {formatBenefitMoneyCents(remainingCents.startsWith('-') ? '0' : remainingCents)}
            </p>
          )}
        </div>
      )}

      <form
        className="flex max-w-xl flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          sendMutation.mutate();
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          Título
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Beneficio (etiqueta)
          <input
            className="input"
            value={discountLabel}
            onChange={(e) => setDiscountLabel(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Valor a imputar (ARS, sin centavos)
          <input
            className="input"
            inputMode="numeric"
            value={imputedPesos}
            onChange={(e) => setImputedPesos(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Vencimiento
          <input
            className="input"
            type="datetime-local"
            value={validTo}
            onChange={(e) => setValidTo(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Emails (separados por coma o línea)
          <textarea
            className="input min-h-[80px]"
            value={manualEmailsRaw}
            onChange={(e) => setManualEmailsRaw(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={sendToFollowers}
            onChange={(e) => setSendToFollowers(e.target.checked)}
          />
          Incluir seguidores del local
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {result && (
          <div className="rounded border border-green-200 bg-green-50 p-3 text-sm">
            Cortesía creada · campaña {result.campaignId}
            {result.fundedFromCourtesyCredit && (
              <span className="ml-2 rounded bg-primary/10 px-2 py-0.5 text-xs">
                Financiada con canje
              </span>
            )}
          </div>
        )}
        <button
          type="submit"
          className="btn btn-primary w-fit"
          disabled={sendMutation.isPending || !imputedValueCents}
        >
          {sendMutation.isPending ? 'Creando…' : 'Crear cortesía financiada'}
        </button>
      </form>
    </PageContainer>
  );
}
