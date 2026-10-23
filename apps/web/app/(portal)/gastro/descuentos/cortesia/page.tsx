'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GastroCourtesySendResponse } from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle } from '@/components';
import { GastroLocationSelector } from '@/components/gastro/GastroLocationSelector';
import {
  GastroCourtesyAudienceSummary,
  GastroCourtesyConfirmDialog,
  GastroCourtesyRequestResult,
} from '@/components/gastro/courtesy/GastroCourtesyRequestDialogs';
import { useGastroActiveLocation } from '@/lib/gastro/GastroActiveLocationContext';
import { resolveCourtesyScope, withCourtesyProfileQuery } from '@/lib/gastro/courtesy-scope';
import { gastroKeys } from '@/lib/query/keys';

function parseEmails(raw: string): string[] {
  return [...new Set(raw.split(/[,;\n]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
}

const INPUT_CLASS = 'mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-text';

export default function GastroCourtesyDiscountsPage() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  // G8.1: the courtesy is always requested for the SELECTED local (?profileId=), never for
  // the API's implicit default local.
  const { profileId: activeProfileId, locations, activeLocation, isLoading } =
    useGastroActiveLocation();
  const scope = resolveCourtesyScope(activeProfileId, locations);
  const gastroProfileId = scope.ok ? scope.profileId : undefined;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discountLabel, setDiscountLabel] = useState('');
  const [validTo, setValidTo] = useState('');
  const [manualEmailsRaw, setManualEmailsRaw] = useState('');
  const [sendToFollowers, setSendToFollowers] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<GastroCourtesySendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const manualEmails = useMemo(() => parseEmails(manualEmailsRaw), [manualEmailsRaw]);

  // Switching local invalidates any previous result / error / confirmation.
  useEffect(() => {
    setResult(null);
    setError(null);
    setConfirmOpen(false);
  }, [gastroProfileId]);

  const previewQuery = useQuery({
    queryKey: ['gastro', 'courtesy-preview', gastroProfileId, manualEmails, sendToFollowers],
    queryFn: () =>
      repos.gastro.previewCourtesyRecipients({
        gastroProfileId: gastroProfileId!,
        manualEmails,
        sendToFollowers,
      }),
    enabled: !!gastroProfileId && (manualEmails.length > 0 || sendToFollowers),
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDiscountLabel('');
    setValidTo('');
    setManualEmailsRaw('');
    setSendToFollowers(false);
    setMessage('');
  };

  const sendMutation = useMutation({
    mutationFn: () =>
      repos.gastro.sendCourtesyDiscounts({
        gastroProfileId: gastroProfileId!,
        title: title.trim(),
        description: description.trim() || undefined,
        discountLabel: discountLabel.trim(),
        validTo: new Date(validTo).toISOString(),
        manualEmails,
        sendToFollowers,
        message: message.trim() || undefined,
      }),
    onSuccess: (data) => {
      setResult(data);
      setConfirmOpen(false);
      setError(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: gastroKeys.discounts(gastroProfileId) });
    },
    onError: (err: Error) => {
      setError(err.message || 'No se pudo enviar la solicitud de cortesía');
      setConfirmOpen(false);
    },
  });

  const preview = previewQuery.data;
  const totalUnique = preview?.totalUnique ?? 0;
  const backHref = withCourtesyProfileQuery(
    '/gastro/descuentos?tipo=cortesias',
    gastroProfileId ?? activeProfileId,
  );

  if (isLoading) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando local…</p>
      </PageContainer>
    );
  }

  const header = (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <SectionTitle>Solicitar cortesía</SectionTitle>
      <Link href={backHref} className="text-sm text-accent hover:underline">
        ← Volver a cortesías
      </Link>
    </div>
  );

  if (!scope.ok) {
    return (
      <PageContainer>
        {header}
        <div className="mb-4 max-w-md">
          <GastroLocationSelector />
        </div>
        <p className="text-sm text-amber-200">
          {scope.reason === 'NOT_ACTIVE'
            ? 'Este local todavía no está activo. Solo los locales activos pueden solicitar cortesías.'
            : 'No encontramos un local para solicitar cortesías. Creá o seleccioná un local.'}
        </p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {header}

      <div className="mb-6 max-w-md">
        <GastroLocationSelector />
        {activeLocation ? (
          <p className="mt-2 text-xs text-text-muted">
            La solicitud se hace en nombre de <strong>{activeLocation.displayName}</strong>.
          </p>
        ) : null}
      </div>

      <p className="mb-6 text-sm text-text-muted">
        Las cortesías son privadas: no se publican en la ficha del local. Tu solicitud queda
        pendiente de aprobación; cuando administración la aprueba, cada destinatario recibe un QR
        único por email.
      </p>

      {result && gastroProfileId ? (
        <GastroCourtesyRequestResult result={result} profileId={gastroProfileId} />
      ) : null}

      <form
        className="mx-auto max-w-xl space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          if (!title.trim() || !discountLabel.trim() || !validTo) {
            setError('Completá título, beneficio y vencimiento');
            return;
          }
          if (manualEmails.length === 0 && !sendToFollowers) {
            setError('Agregá emails o activá envío a seguidores');
            return;
          }
          if (totalUnique === 0) {
            setError('No hay destinatarios válidos');
            return;
          }
          setConfirmOpen(true);
        }}
      >
        <div>
          <label className="block text-sm font-medium text-text" htmlFor="courtesy-title">
            Título de cortesía
          </label>
          <input
            id="courtesy-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={INPUT_CLASS}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text" htmlFor="courtesy-desc">
            Descripción breve
          </label>
          <textarea
            id="courtesy-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text" htmlFor="courtesy-label">
            Beneficio
          </label>
          <input
            id="courtesy-label"
            value={discountLabel}
            onChange={(e) => setDiscountLabel(e.target.value)}
            placeholder="Ej: Postre de cortesía · 20% en cena"
            className={INPUT_CLASS}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text" htmlFor="courtesy-valid-to">
            Válido hasta
          </label>
          <input
            id="courtesy-valid-to"
            type="datetime-local"
            value={validTo}
            onChange={(e) => setValidTo(e.target.value)}
            className={INPUT_CLASS}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text" htmlFor="courtesy-emails">
            Emails individuales (uno por línea o separados por coma)
          </label>
          <textarea
            id="courtesy-emails"
            value={manualEmailsRaw}
            onChange={(e) => setManualEmailsRaw(e.target.value)}
            rows={4}
            placeholder="cliente1@email.com&#10;cliente2@email.com"
            className={`${INPUT_CLASS} font-mono text-sm`}
          />
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-border p-4">
          <input
            type="checkbox"
            checked={sendToFollowers}
            onChange={(e) => setSendToFollowers(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm text-text">
            Incluir a los usuarios que siguen este local
            {previewQuery.isFetching && sendToFollowers && (
              <span className="mt-1 block text-text-muted">Calculando seguidores…</span>
            )}
            {preview && sendToFollowers && preview.followersCount === 0 && (
              <span className="mt-1 block text-amber-400">
                Este local todavía no tiene seguidores.
              </span>
            )}
          </span>
        </label>

        <div>
          <label className="block text-sm font-medium text-text" htmlFor="courtesy-message">
            Mensaje opcional para los destinatarios
          </label>
          <textarea
            id="courtesy-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            className={INPUT_CLASS}
          />
        </div>

        {preview && totalUnique > 0 ? <GastroCourtesyAudienceSummary preview={preview} /> : null}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={sendMutation.isPending}
          className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-bg hover:bg-accent-hover disabled:opacity-60"
        >
          Revisar y enviar solicitud
        </button>
      </form>

      {confirmOpen && (
        <GastroCourtesyConfirmDialog
          totalUnique={totalUnique}
          localName={activeLocation?.displayName}
          pending={sendMutation.isPending}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => sendMutation.mutate()}
        />
      )}
    </PageContainer>
  );
}
