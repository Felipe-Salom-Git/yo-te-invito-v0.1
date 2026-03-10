'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { useProducerId } from '@/hooks/useProducerId';
import { usePayoutsByProducer, useCreatePayout } from '@/lib/query/payouts';
import { PageContainer, SectionTitle, Card, CardContent, Modal } from '@/components';
import { PayoutRequestForm } from '@/components/producer/PayoutRequestForm';


const STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Solicitado',
  PENDING: 'Pendiente',
  PROCESSING: 'En proceso',
  SENT: 'Enviado',
  REJECTED: 'Rechazado',
};

export default function ProducerPayoutsPage() {
  const { data: session, status } = useSession();
  const { tenantId: TENANT_ID } = useTenant();
  const PRODUCER_ID = useProducerId();
  const repos = useRepositories();
  const userId = (session?.user as { userId?: string })?.userId ?? (session?.user as { id?: string })?.id ?? '';
  const [showForm, setShowForm] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const { data: payouts, isLoading } = usePayoutsByProducer(PRODUCER_ID, TENANT_ID);
  const createMutation = useCreatePayout(PRODUCER_ID);

  const { data: eventsData } = useQuery({
    queryKey: ['events', 'producer', PRODUCER_ID, TENANT_ID],
    queryFn: () => repos.events.list({ tenantId: TENANT_ID, producerId: PRODUCER_ID, limit: 50 }),
    enabled: !!PRODUCER_ID,
  });

  const events = eventsData?.data ?? [];
  const eventTitles: Record<string, string> = {};
  events.forEach((e) => {
    eventTitles[e.id] = e.title;
  });

  const handleCreate = (data: { amountCents: number; bankInfo: { titular: string; banco: string; cbu: string } }) => {
    if (!selectedEventId) return;
    createMutation.mutate(
      {
        tenantId: TENANT_ID,
        eventId: selectedEventId,
        amountCents: data.amountCents,
        bankInfo: data.bankInfo,
        requestedByUserId: userId,
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setSelectedEventId(null);
        },
      }
    );
  };

  const selectedEvent = selectedEventId ? events.find((e) => e.id === selectedEventId) : null;

  if (status === 'loading') {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }

  if (!session?.user) {
    return (
      <PageContainer>
        <p className="text-text-muted">Debés iniciar sesión.</p>
        <Link href="/login" className="mt-4 inline-block text-accent hover:underline">
          Iniciar sesión
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link href="/producer" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Panel
      </Link>
      <SectionTitle>Solicitudes de retiro</SectionTitle>

      <div className="mt-6 flex flex-wrap gap-2">
        {events
          .filter((e) => e.id)
          .map((ev) => (
            <button
              key={ev.id}
              type="button"
              onClick={() => {
                setSelectedEventId(ev.id);
                setShowForm(true);
              }}
              className="rounded border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent/10"
            >
              Solicitar retiro: {ev.title}
            </button>
          ))}
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-text">Historial</h2>
        {isLoading && <p className="mt-4 text-text-muted">Cargando…</p>}
        {!isLoading && (!payouts || payouts.length === 0) && (
          <p className="mt-4 text-text-muted">No hay solicitudes.</p>
        )}
        {!isLoading && payouts && payouts.length > 0 && (
          <ul className="mt-4 space-y-3">
            {payouts.map((p) => (
              <Card key={p.id}>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-text">
                        {eventTitles[p.eventId] ?? p.eventId} — ${(p.amountCents / 100).toLocaleString('es-AR')}
                      </p>
                      <p className="text-xs text-text-muted">
                        {new Date(p.createdAt).toLocaleDateString('es-AR')} · {STATUS_LABELS[p.status] ?? p.status}
                      </p>
                    </div>
                    <span className="rounded bg-border px-2 py-1 text-xs font-medium text-text-muted">
                      {p.status}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </ul>
        )}
      </section>

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setSelectedEventId(null);
        }}
        title="Solicitar retiro"
      >
        {selectedEvent && (
          <PayoutRequestForm
            eventId={selectedEvent.id}
            eventTitle={selectedEvent.title}
            maxAmountCents={500000}
            onSubmit={handleCreate}
            isSubmitting={createMutation.isPending}
            onCancel={() => {
              setShowForm(false);
              setSelectedEventId(null);
            }}
          />
        )}
      </Modal>
    </PageContainer>
  );
}
