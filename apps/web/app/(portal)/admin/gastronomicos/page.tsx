'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gastroPromotionStoredPayloadSchema } from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';
import { ImageUrlPreview } from '@/components/admin/ImageUrlPreview';
import { getErrorMessage } from '@/lib/errors';
import type { InboxItemSummary } from '@/repositories/interfaces';

function GastroPromotionPayloadView({ payload }: { payload: unknown }) {
  const r = gastroPromotionStoredPayloadSchema.safeParse(payload);
  if (!r.success) {
    return (
      <pre className="mt-2 max-h-40 overflow-auto rounded bg-bg p-2 text-xs text-text-muted">
        {JSON.stringify(payload, null, 2)}
      </pre>
    );
  }
  const p = r.data;
  return (
    <div className="mt-3 space-y-2 rounded-lg border border-border/80 bg-bg/40 p-3 text-sm text-text">
      <p>
        <span className="text-text-muted">Título:</span> {p.promotionTitle}
      </p>
      {p.promotionDescription ? (
        <p>
          <span className="text-text-muted">Descripción:</span> {p.promotionDescription}
        </p>
      ) : null}
      <p>
        <span className="text-text-muted">Teléfono(s):</span> {p.contactPhones.join(', ')}
      </p>
      {p.imageUrls && p.imageUrls.length > 0 ? (
        <div>
          <p className="text-text-muted">Imágenes cargadas</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {p.imageUrls.map((url, i) => (
              <ImageUrlPreview key={i} url={url} className="!mt-0 max-h-36 w-full" />
            ))}
          </div>
        </div>
      ) : null}
      {p.notesForAdmin ? (
        <p>
          <span className="text-text-muted">Notas internas del gastro:</span> {p.notesForAdmin}
        </p>
      ) : null}
      {p.suggestedDiscountType && p.suggestedValue ? (
        <p className="text-xs text-text-muted">
          Sugerido: {p.suggestedDiscountType === 'PERCENT' ? `${p.suggestedValue}%` : `$${p.suggestedValue}`}
        </p>
      ) : null}
    </div>
  );
}

export default function AdminGastronomicosPage() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [filterStatus, setFilterStatus] = useState<string>('PENDING');
  const [resolveItem, setResolveItem] = useState<InboxItemSummary | null>(null);
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [note, setNote] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [discountValue, setDiscountValue] = useState('');
  const [discountValidFrom, setDiscountValidFrom] = useState('');
  const [discountValidTo, setDiscountValidTo] = useState('');
  const [officialReply, setOfficialReply] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'gastronomicos', filterStatus],
    queryFn: () =>
      repos.inbox.listAdmin(
        filterStatus === 'ALL' ? undefined : { status: filterStatus },
      ),
  });

  const resolveMutation = useMutation({
    mutationFn: async () => {
      if (!resolveItem) return null;
      const base = { decision, note: note.trim() || undefined } as const;
      if (decision === 'REJECTED') {
        return repos.inbox.resolveAdmin(resolveItem.id, base);
      }
      if (resolveItem.kind === 'GASTRO_PROMOTION_REQUEST') {
        const validFromIso = discountValidFrom.trim()
          ? new Date(discountValidFrom).toISOString()
          : undefined;
        const validToIso = discountValidTo.trim() ? new Date(discountValidTo).toISOString() : undefined;
        const hasManual = Boolean(discountCode.trim() && discountValue.trim());
        const discount = hasManual
          ? {
              code: discountCode.trim(),
              type: discountType,
              value: Number(discountValue),
              ...(validFromIso ? { validFrom: validFromIso } : {}),
              ...(validToIso ? { validTo: validToIso } : {}),
            }
          : undefined;
        return repos.inbox.resolveAdmin(resolveItem.id, {
          ...base,
          ...(discount ? { discount } : {}),
          ...(!discount && (validFromIso || validToIso)
            ? {
                ...(validFromIso ? { promotionValidFrom: validFromIso } : {}),
                ...(validToIso ? { promotionValidTo: validToIso } : {}),
              }
            : {}),
        });
      }
      return repos.inbox.resolveAdmin(resolveItem.id, {
        ...base,
        officialReply: officialReply.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'gastronomicos'] });
      addToast('Resuelto', 'success');
      setResolveItem(null);
      setNote('');
      setDiscountCode('');
      setDiscountValue('');
      setDiscountValidFrom('');
      setDiscountValidTo('');
      setOfficialReply('');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const items = data?.items ?? [];

  return (
    <PageContainer>
      <Link href="/admin" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Admin
      </Link>
      <SectionTitle>Gastronómicos</SectionTitle>
      <p className="mt-2 text-sm text-text-muted">
        Solicitudes de cupones gastro (con imágenes y contacto) y moderación de reseñas. Al aprobar una promo gastro,
        cargás el código y vigencia; el cupón queda publicado en la ficha del local y en el carrusel de Gastronomía del
        inicio.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilterStatus(s)}
            className={`rounded px-3 py-1 text-sm ${
              filterStatus === s ? 'bg-accent text-bg' : 'bg-bg-muted text-text-muted'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="mt-6 text-text-muted">Cargando…</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-border bg-bg-muted p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-text">{item.title}</p>
                  <p className="text-xs text-text-muted">
                    {item.kind} · {item.status} · {new Date(item.createdAt).toLocaleString('es-AR')}
                  </p>
                  {item.summary && <p className="mt-2 text-sm text-text-muted">{item.summary}</p>}
                  {item.kind === 'GASTRO_PROMOTION_REQUEST' ? (
                    <GastroPromotionPayloadView payload={item.payload} />
                  ) : (
                    <pre className="mt-2 max-h-32 overflow-auto rounded bg-bg p-2 text-xs text-text-muted">
                      {JSON.stringify(item.payload, null, 2)}
                    </pre>
                  )}
                </div>
                {item.status === 'PENDING' && (
                  <Button size="sm" variant="outline" onClick={() => setResolveItem(item)}>
                    Resolver
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {items.length === 0 && !isLoading && (
        <p className="mt-6 text-text-muted">No hay ítems con este filtro.</p>
      )}

      {resolveItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-bg p-6 shadow-xl">
            <h3 className="font-semibold text-text">Resolver solicitud</h3>
            <p className="mt-1 text-sm text-text-muted">{resolveItem.title}</p>
            {resolveItem.kind === 'GASTRO_PROMOTION_REQUEST' && (
              <GastroPromotionPayloadView payload={resolveItem.payload} />
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className={`rounded px-3 py-1 text-sm ${decision === 'APPROVED' ? 'bg-accent text-bg' : 'bg-bg-muted'}`}
                onClick={() => setDecision('APPROVED')}
              >
                Aprobar
              </button>
              <button
                type="button"
                className={`rounded px-3 py-1 text-sm ${decision === 'REJECTED' ? 'bg-red-600 text-white' : 'bg-bg-muted'}`}
                onClick={() => setDecision('REJECTED')}
              >
                Rechazar
              </button>
            </div>

            <Input label="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} className="mt-4" />

            {decision === 'APPROVED' && resolveItem.kind === 'GASTRO_PROMOTION_REQUEST' && (
              <div className="relative mt-4 overflow-hidden rounded-xl border-2 border-dashed border-accent/40 bg-gradient-to-b from-bg-muted to-bg p-4 shadow-inner">
                <div
                  className="pointer-events-none absolute inset-x-8 top-0 h-4 opacity-40"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, transparent, transparent 6px, currentColor 6px, currentColor 8px)',
                  }}
                  aria-hidden
                />
                <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                  Ticket · cupón público
                </p>
                <p className="mt-2 text-center text-[11px] leading-relaxed text-text-muted">
                  Completá el código y el beneficio. Al confirmar, el cupón queda activo y visible en el detalle del
                  restaurante y en el home (carrusel Gastronomía).
                </p>
                <p className="mt-2 text-center text-[11px] text-text-muted">
                  Podés dejar código vacío para generar uno automático (respeta la sugerencia del gastro o 10% por
                  defecto).
                </p>
                <div className="mt-4 space-y-2 border-t border-border/60 pt-4">
                  <Input
                    label="Código del cupón"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    placeholder="Ej. VERANO20"
                  />
                  <label className="block text-sm font-medium text-text">Tipo de beneficio</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'PERCENT' | 'FIXED')}
                    className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
                  >
                    <option value="PERCENT">Porcentaje</option>
                    <option value="FIXED">Monto fijo</option>
                  </select>
                  <Input
                    label="Valor"
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                  />
                  <Input
                    label="Válido desde (opcional)"
                    type="datetime-local"
                    value={discountValidFrom}
                    onChange={(e) => setDiscountValidFrom(e.target.value)}
                  />
                  <Input
                    label="Válido hasta (opcional)"
                    type="datetime-local"
                    value={discountValidTo}
                    onChange={(e) => setDiscountValidTo(e.target.value)}
                  />
                </div>
              </div>
            )}

            {decision === 'APPROVED' && resolveItem.kind === 'REVIEW_MODERATION_REQUEST' && (
              <Input
                label="Respuesta oficial (si aplica al tipo de solicitud)"
                value={officialReply}
                onChange={(e) => setOfficialReply(e.target.value)}
                className="mt-4"
              />
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResolveItem(null)}>
                Cancelar
              </Button>
              <Button onClick={() => resolveMutation.mutate()} disabled={resolveMutation.isPending}>
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
