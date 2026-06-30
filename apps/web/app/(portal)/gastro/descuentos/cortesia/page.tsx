'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle } from '@/components';
import { gastroKeys } from '@/lib/query/keys';

function parseEmails(raw: string): string[] {
  return [...new Set(raw.split(/[,;\n]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
}

export default function GastroCourtesyDiscountsPage() {
  const repos = useRepositories();
  const { data: localData } = useQuery({
    queryKey: gastroKeys.local(),
    queryFn: () => repos.gastro.getMyLocal(),
  });
  const profile = localData;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discountLabel, setDiscountLabel] = useState('');
  const [validTo, setValidTo] = useState('');
  const [manualEmailsRaw, setManualEmailsRaw] = useState('');
  const [sendToFollowers, setSendToFollowers] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<import('@yo-te-invito/shared').GastroCourtesySendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const manualEmails = useMemo(() => parseEmails(manualEmailsRaw), [manualEmailsRaw]);

  const previewQuery = useQuery({
    queryKey: ['gastro', 'courtesy-preview', profile?.id, manualEmails, sendToFollowers],
    queryFn: () =>
      repos.gastro.previewCourtesyRecipients({
        gastroProfileId: profile!.id,
        manualEmails,
        sendToFollowers,
      }),
    enabled: !!profile?.id && (manualEmails.length > 0 || sendToFollowers),
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      repos.gastro.sendCourtesyDiscounts({
        gastroProfileId: profile!.id,
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
    },
    onError: (err: Error) => {
      setError(err.message || 'No se pudieron enviar las cortesías');
      setConfirmOpen(false);
    },
  });

  const preview = previewQuery.data;
  const totalUnique = preview?.totalUnique ?? 0;

  if (!profile) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando local…</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle>Enviar cortesías</SectionTitle>
        <Link href="/gastro/descuentos" className="text-sm text-accent hover:underline">
          ← Volver a descuentos
        </Link>
      </div>

      <p className="mb-6 text-sm text-text-muted">
        Las cortesías son privadas: no se publican en la ficha del restaurante. Cada destinatario
        recibe un QR único por email.
      </p>

      {result && (
        <div
          className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
            result.failedCount > 0 || result.sentCount === 0
              ? 'border-amber-500/40 bg-amber-500/10 text-text'
              : 'border-accent/40 bg-accent/10 text-text'
          }`}
        >
          {!result.emailConfigured ? (
            <p className="font-medium text-amber-200">
              El servicio de email no está configurado en el servidor. Las cortesías se crearon pero
              no pudimos enviar los emails.
            </p>
          ) : result.sentCount > 0 ? (
            <p>
              Cortesías enviadas correctamente ({result.sentCount} de {result.createdCount} emails
              {result.skippedCount > 0 ? `, ${result.skippedCount} omitidos` : ''}).
            </p>
          ) : (
            <p className="font-medium text-amber-200">
              Se crearon {result.createdCount} cortesías, pero no se pudo enviar ningún email.
            </p>
          )}
          {result.failedCount > 0 ? (
            <ul className="mt-2 list-inside list-disc text-xs text-text-muted">
              {result.failures.slice(0, 5).map((f) => (
                <li key={f.email}>
                  {f.email}: {f.reason}
                </li>
              ))}
              {result.failures.length > 5 ? (
                <li>…y {result.failures.length - 5} más</li>
              ) : null}
            </ul>
          ) : null}
        </div>
      )}

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
            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-text"
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
            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-text"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text" htmlFor="courtesy-label">
            Beneficio / descuento
          </label>
          <input
            id="courtesy-label"
            value={discountLabel}
            onChange={(e) => setDiscountLabel(e.target.value)}
            placeholder="Ej: 20% en cena"
            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-text"
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
            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-text"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text" htmlFor="courtesy-emails">
            Emails manuales (uno por línea o separados por coma)
          </label>
          <textarea
            id="courtesy-emails"
            value={manualEmailsRaw}
            onChange={(e) => setManualEmailsRaw(e.target.value)}
            rows={4}
            placeholder="cliente1@email.com&#10;cliente2@email.com"
            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm text-text"
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
            Enviar a usuarios que siguen este restaurante
            {previewQuery.isFetching && sendToFollowers && (
              <span className="mt-1 block text-text-muted">Calculando seguidores…</span>
            )}
            {preview && sendToFollowers && preview.followersCount === 0 && (
              <span className="mt-1 block text-amber-400">
                Este restaurante todavía no tiene seguidores.
              </span>
            )}
            {preview && sendToFollowers && preview.followersCount > 0 && (
              <span className="mt-1 block text-text-muted">
                {preview.followersCount} seguidor{preview.followersCount === 1 ? '' : 'es'} en total.
              </span>
            )}
          </span>
        </label>

        <div>
          <label className="block text-sm font-medium text-text" htmlFor="courtesy-message">
            Mensaje opcional
          </label>
          <textarea
            id="courtesy-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-text"
          />
        </div>

        {preview && totalUnique > 0 && (
          <p className="text-sm text-text-muted">
            Vas a enviar esta cortesía a {totalUnique} destinatario{totalUnique === 1 ? '' : 's'}
            {preview.duplicateCount > 0
              ? ` (${preview.duplicateCount} duplicados omitidos)`
              : ''}
            .
          </p>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={sendMutation.isPending}
          className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-bg hover:bg-accent-hover disabled:opacity-60"
        >
          Enviar cortesías
        </button>
      </form>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-bg p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-text">Confirmar envío</h3>
            <p className="mt-2 text-sm text-text-muted">
              Vas a enviar esta cortesía a {totalUnique} destinatario{totalUnique === 1 ? '' : 's'}.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm text-text"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={sendMutation.isPending}
                onClick={() => sendMutation.mutate()}
                className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg disabled:opacity-60"
              >
                {sendMutation.isPending ? 'Enviando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
