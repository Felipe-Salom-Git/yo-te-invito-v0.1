'use client';

import { useMemo, useState } from 'react';
import type { ReferralCommissionType } from '@yo-te-invito/shared';
import { Button, Input } from '@/components';
import { ReferralLegalDisclaimer } from './ReferralLegalDisclaimer';
import {
  commissionTypeLabel,
  formatCommissionValue,
} from '@/lib/producer/referral-display';
import { useCreateProducerReferralProposal } from '@/hooks/useProducerReferralProposals';
import { getErrorMessage } from '@/lib/errors';

export type ReferrerOption = {
  id: string;
  displayName: string;
  publicHandle?: string | null;
};

type EventOption = { id: string; title: string };

type Props = {
  eventId?: string;
  eventTitle?: string;
  eventOptions?: EventOption[];
  referrers: ReferrerOption[];
  defaultReferrerProfileId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function ProducerReferralProposalForm({
  eventId: fixedEventId,
  eventTitle,
  eventOptions,
  referrers,
  defaultReferrerProfileId,
  onSuccess,
  onCancel,
}: Props) {
  const createMutation = useCreateProducerReferralProposal();

  const [eventId, setEventId] = useState(fixedEventId ?? '');
  const [referrerProfileId, setReferrerProfileId] = useState(
    defaultReferrerProfileId ?? referrers[0]?.id ?? '',
  );
  const [commissionType, setCommissionType] = useState<ReferralCommissionType>('PERCENTAGE');
  const [commissionValue, setCommissionValue] = useState('');
  const [message, setMessage] = useState('');
  const [terms, setTerms] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  const resolvedEventTitle = useMemo(() => {
    if (eventTitle) return eventTitle;
    return eventOptions?.find((e) => e.id === eventId)?.title ?? 'Evento seleccionado';
  }, [eventTitle, eventOptions, eventId]);

  const resolvedReferrerName = referrers.find((r) => r.id === referrerProfileId)?.displayName;

  const previewValue = useMemo(() => {
    const n = parseFloat(commissionValue.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return null;
    if (commissionType === 'PERCENTAGE' && n > 100) return null;
    if (commissionType === 'FIXED_PER_TICKET' && !Number.isInteger(n)) return null;
    return formatCommissionValue(commissionType, n);
  }, [commissionType, commissionValue]);

  const valueLabel =
    commissionType === 'PERCENTAGE'
      ? 'Porcentaje (%)'
      : 'Monto fijo por entrada (centavos ARS)';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetEventId = fixedEventId ?? eventId;
    if (!targetEventId || !referrerProfileId) return;
    const n = parseFloat(commissionValue.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return;
    if (!acknowledged) return;

    createMutation.mutate(
      {
        eventId: targetEventId,
        referrerProfileId,
        commissionType,
        commissionValue: n,
        message: message.trim() || undefined,
        terms: terms.trim() || undefined,
      },
      {
        onSuccess: () => {
          setCommissionValue('');
          setMessage('');
          setTerms('');
          setAcknowledged(false);
          onSuccess?.();
        },
      },
    );
  };

  if (referrers.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-text-muted">
        Necesitás al menos un referido asociado activo para enviar una propuesta. Gestioná la
        asociación en Mis referidos.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!fixedEventId && eventOptions && eventOptions.length > 0 && (
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-text">Evento</span>
          <select
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            required
          >
            <option value="">Seleccionar evento</option>
            {eventOptions.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-text">Referido</span>
        <select
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          value={referrerProfileId}
          onChange={(e) => setReferrerProfileId(e.target.value)}
          required
        >
          {referrers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.displayName}
              {r.publicHandle ? ` (@${r.publicHandle})` : ''}
            </option>
          ))}
        </select>
      </label>

      <div>
        <p className="mb-2 text-sm font-medium text-text">Comisión por entrada</p>
        <div className="flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
            <input
              type="radio"
              name="commissionType"
              checked={commissionType === 'PERCENTAGE'}
              onChange={() => {
                setCommissionType('PERCENTAGE');
                setCommissionValue('');
              }}
            />
            Porcentaje
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
            <input
              type="radio"
              name="commissionType"
              checked={commissionType === 'FIXED_PER_TICKET'}
              onChange={() => {
                setCommissionType('FIXED_PER_TICKET');
                setCommissionValue('');
              }}
            />
            Monto fijo
          </label>
        </div>
      </div>

      <Input
        label={valueLabel}
        type="number"
        min={commissionType === 'PERCENTAGE' ? 0.01 : 1}
        max={commissionType === 'PERCENTAGE' ? 100 : undefined}
        step={commissionType === 'PERCENTAGE' ? 0.1 : 1}
        value={commissionValue}
        onChange={(e) => setCommissionValue(e.target.value)}
        required
        placeholder={commissionType === 'PERCENTAGE' ? 'Ej. 10' : 'Ej. 500 (= $5 por entrada)'}
      />

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-text">Mensaje (opcional)</span>
        <textarea
          className="min-h-[80px] w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          placeholder="Contexto para el referido"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-text">Términos (opcional)</span>
        <textarea
          className="min-h-[72px] w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          maxLength={4000}
          placeholder="Condiciones adicionales del acuerdo"
        />
      </label>

      <div className="rounded-xl border border-border bg-bg-muted/50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Vista previa del acuerdo
        </p>
        <ul className="mt-3 space-y-2 text-sm text-text-muted">
          <li>
            <span className="text-text-muted">Evento:</span>{' '}
            <span className="text-text">{resolvedEventTitle}</span>
          </li>
          <li>
            <span className="text-text-muted">Referido:</span>{' '}
            <span className="text-text">{resolvedReferrerName ?? '—'}</span>
          </li>
          <li>
            <span className="text-text-muted">Regla:</span>{' '}
            <span className="text-text">
              {commissionTypeLabel(commissionType)}
              {previewValue ? ` · ${previewValue}` : ' · (completá el valor)'}
            </span>
          </li>
        </ul>
        <p className="mt-3 text-xs text-text-muted">
          Si el referido acepta, se activará el link de venta con esta regla. La comisión generada
          se calculará según ventas atribuidas; no es saldo en la plataforma.
        </p>
      </div>

      <ReferralLegalDisclaimer />

      <label className="flex cursor-pointer items-start gap-3 text-sm text-text">
        <input
          type="checkbox"
          className="mt-1"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
        />
        <span>
          Entiendo que Yo Te Invito no procesa ni garantiza el pago de comisiones a referidos.
        </span>
      </label>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cerrar
          </Button>
        )}
        <Button
          type="submit"
          disabled={
            createMutation.isPending ||
            !acknowledged ||
            !(fixedEventId ?? eventId) ||
            !referrerProfileId ||
            !commissionValue
          }
        >
          {createMutation.isPending ? 'Enviando…' : 'Enviar propuesta'}
        </Button>
      </div>
      {createMutation.isError && (
        <p className="text-sm text-red-400">{getErrorMessage(createMutation.error)}</p>
      )}
    </form>
  );
}
