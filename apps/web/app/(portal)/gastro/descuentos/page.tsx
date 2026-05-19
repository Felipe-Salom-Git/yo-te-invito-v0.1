'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';
import { GastroPromoRequestModal } from '@/components/gastro/GastroPromoRequestModal';
import { getErrorMessage } from '@/lib/errors';
import { gastroDiscountQrPayload, qrImageUrl } from '@/lib/qr-image';
import type { CreateGastroPromotionRequestBody } from '@yo-te-invito/shared';

const TENANT_ID = 'tenant-demo';

export default function GastroDescuentosPage() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newType, setNewType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [newValue, setNewValue] = useState('');
  const [newValidFrom, setNewValidFrom] = useState('');
  const [newValidTo, setNewValidTo] = useState('');

  const { data: eventsData } = useQuery({
    queryKey: ['events', 'gastro', TENANT_ID],
    queryFn: () => repos.events.list({ tenantId: TENANT_ID, category: 'gastro', limit: 50 }),
  });

  const { data: discounts = [], isLoading } = useQuery({
    queryKey: ['gastroDiscounts', selectedEventId],
    queryFn: () => repos.gastro.listDiscounts(selectedEventId),
    enabled: !!selectedEventId,
  });

  const { data: validations = [] } = useQuery({
    queryKey: ['gastroValidations'],
    queryFn: () => repos.gastro.listValidations(),
  });

  const { data: myInboxData } = useQuery({
    queryKey: ['me', 'inbox'],
    queryFn: () => repos.inbox.listMine(),
  });

  const events = eventsData?.data ?? [];
  const currentEventId = selectedEventId || events[0]?.id;
  const myPromoRequests =
    myInboxData?.items.filter((i) => i.kind === 'GASTRO_PROMOTION_REQUEST') ?? [];

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      repos.gastro.updateDiscount(id, { status }),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gastroDiscounts', selectedEventId] }),
  });

  const promoMutation = useMutation({
    mutationFn: (body: CreateGastroPromotionRequestBody) => repos.inbox.createGastroPromotion(body),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      addToast('Solicitud enviada al inbox de administración', 'success');
      queryClient.invalidateQueries({ queryKey: ['me', 'inbox'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      repos.gastro.createDiscount(selectedEventId, {
        code: newCode.trim(),
        type: newType,
        value: Number(newValue) || 0,
        validFrom: newValidFrom || undefined,
        validTo: newValidTo || undefined,
      }),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastroDiscounts', selectedEventId] });
      setShowCreate(false);
      setNewCode('');
      setNewValue('');
      setNewValidFrom('');
      setNewValidTo('');
    },
  });

  const validationCountByDiscount: Record<string, number> = {};
  validations.forEach((v) => {
    validationCountByDiscount[v.discountId] = (validationCountByDiscount[v.discountId] ?? 0) + 1;
  });

  useEffect(() => {
    if (!selectedEventId && events[0]) setSelectedEventId(events[0].id);
  }, [events, selectedEventId]);

  if (events.length === 0) {
    return (
      <PageContainer>
        <Link href="/gastro" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
          ← Dashboard
        </Link>
        <SectionTitle>Descuentos</SectionTitle>
        <p className="mt-4 text-text-muted">No hay eventos gastro.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link href="/gastro" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Dashboard
      </Link>
      <SectionTitle>Descuentos</SectionTitle>
      <p className="mt-2 text-text-muted">Crear y editar descuentos. QR con código y valor; contador de usos.</p>

      <div className="mt-6">
        <label className="block text-sm font-medium text-text">Evento</label>
        <select
          value={currentEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="mt-1 rounded border border-border bg-bg px-3 py-2 text-text"
        >
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
      </div>

      <section className="mt-8 rounded-lg border border-border bg-bg-muted p-4">
        <h2 className="font-semibold text-text">Cupones con administración</h2>
        <p className="mt-1 text-sm text-text-muted">
          Pedí un nuevo cupón con datos e imágenes. Administración revisa la solicitud y publica el código; luego
          aparece en la ficha del local y en la sección Gastronomía del inicio.
        </p>
        <Button
          className="mt-4"
          onClick={() => setPromoModalOpen(true)}
          disabled={!(selectedEventId || events[0]?.id)}
        >
          Solicitar nuevo cupón de descuento
        </Button>
      </section>

      <GastroPromoRequestModal
        open={promoModalOpen}
        onClose={() => setPromoModalOpen(false)}
        eventId={currentEventId}
        eventLabel={events.find((e) => e.id === currentEventId)?.title ?? ''}
        isSubmitting={promoMutation.isPending}
        onSubmit={async (body) => {
          await promoMutation.mutateAsync(body);
        }}
      />

      {myPromoRequests.length > 0 && (
        <section className="mt-8 rounded-lg border border-border bg-bg-muted p-4">
          <h2 className="font-semibold text-text">Tus solicitudes de promoción</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {myPromoRequests.map((item) => (
              <li key={item.id} className="flex flex-wrap justify-between gap-2 border-b border-border/60 pb-2 last:border-0">
                <span className="text-text">{item.title}</span>
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    item.status === 'PENDING'
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                      : item.status === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                        : 'bg-border text-text-muted'
                  }`}
                >
                  {item.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-4">
        <Button onClick={() => setShowCreate(!showCreate)} variant="outline">
          {showCreate ? 'Cancelar' : 'Crear descuento'}
        </Button>
        {showCreate && (
          <div className="mt-4 rounded-lg border border-border bg-bg-muted p-4">
            <Input label="Código" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="Ej. VERANO20" required />
            <div className="mt-3">
              <label className="block text-sm font-medium text-text">Tipo</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value as 'PERCENT' | 'FIXED')} className="mt-1 rounded border border-border bg-bg px-3 py-2 text-text">
                <option value="PERCENT">Porcentaje</option>
                <option value="FIXED">Monto fijo</option>
              </select>
            </div>
            <Input label="Valor" type="number" value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder={newType === 'PERCENT' ? '20' : '500'} className="mt-3" />
            <Input label="Válido desde (opcional)" type="datetime-local" value={newValidFrom} onChange={(e) => setNewValidFrom(e.target.value)} className="mt-3" />
            <Input label="Válido hasta (opcional)" type="datetime-local" value={newValidTo} onChange={(e) => setNewValidTo(e.target.value)} className="mt-3" />
            <Button className="mt-3" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !newCode.trim()}>
              Crear
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="mt-6 text-text-muted">Cargando…</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {discounts.map((d) => (
            <li key={d.id} className="rounded-lg border border-border bg-bg-muted p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-text">
                    Código: <span className="text-accent">{d.code}</span>
                    <span className="ml-2 text-text-muted">
                      {d.type === 'PERCENT' ? `${d.value}%` : `$${d.value}`}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    {d.validFrom ? new Date(d.validFrom).toLocaleDateString() : '—'} –{' '}
                    {d.validTo ? new Date(d.validTo).toLocaleDateString() : '—'}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    Código para mostrar en puerta · Usos registrados: {validationCountByDiscount[d.id] ?? 0}
                  </p>
                  <div className="mt-3 flex flex-wrap items-end gap-4">
                    <img
                      src={qrImageUrl(gastroDiscountQrPayload(currentEventId, d.id, d.code), 160)}
                      alt=""
                      width={160}
                      height={160}
                      className="rounded border border-border bg-white p-1"
                    />
                    <p className="max-w-xs text-xs text-text-muted">
                      QR con payload para escáner (v1). Si el escáner aún no interpreta gastro, podés validar manualmente
                      desde la PWA ingresando el ID del descuento.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${d.status === 'ACTIVE' ? 'bg-green-500/20 text-green-600' : 'bg-border text-text-muted'}`}>
                    {d.status}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateMutation.mutate({ id: d.id, status: d.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
                    disabled={updateMutation.isPending}
                  >
                    {d.status === 'ACTIVE' ? 'Dar de baja' : 'Activar'}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {discounts.length === 0 && !isLoading && !showCreate && (
        <p className="mt-6 text-text-muted">Sin descuentos. Creá uno con el botón arriba.</p>
      )}
    </PageContainer>
  );
}
