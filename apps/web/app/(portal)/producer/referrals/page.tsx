'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { useProducerId } from '@/hooks/useProducerId';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';


export default function ProducerReferralsPage() {
  const { data: session, status } = useSession();
  const { tenantId: TENANT_ID } = useTenant();
  const PRODUCER_ID = useProducerId();
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [refEmail, setRefEmail] = useState('');
  const [refFirstName, setRefFirstName] = useState('');
  const [refLastName, setRefLastName] = useState('');

  const createReferrerMutation = useMutation({
    mutationFn: (input: { email: string; firstName: string; lastName: string }) =>
      repos.users.createReferrer(input),
    onSuccess: (user) => {
      addToast(`${user.firstName} ${user.lastName} (${user.email}) creado. Puede iniciar sesión con contraseña "demo".`, 'success');
      setRefEmail('');
      setRefFirstName('');
      setRefLastName('');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  const handleCreateReferrer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refEmail.trim() || !refFirstName.trim() || !refLastName.trim()) return;
    createReferrerMutation.mutate({ email: refEmail.trim(), firstName: refFirstName.trim(), lastName: refLastName.trim() });
  };

  const { data: eventsData } = useQuery({
    queryKey: ['events', 'producer', PRODUCER_ID, TENANT_ID],
    queryFn: () => repos.events.list({ tenantId: TENANT_ID, producerId: PRODUCER_ID, limit: 50 }),
    enabled: status === 'authenticated',
  });

  const events = eventsData?.data ?? [];

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
      <SectionTitle>Referidos</SectionTitle>
      <p className="mt-2 text-text-muted">
        Gestioná los links de referidos por evento. Creá referidos y asignales eventos.
      </p>

      <section className="mt-6 rounded-lg border border-border bg-bg-muted p-4">
        <h3 className="font-semibold text-text">Crear usuario referido</h3>
        <p className="mt-1 text-sm text-text-muted">
          Dá de alta un referido (User con rol REFERRER). Podrá iniciar sesión con email y contraseña &quot;demo&quot;.
        </p>
        <form onSubmit={handleCreateReferrer} className="mt-4 flex flex-wrap items-end gap-3">
          <Input
            label="Email"
            type="email"
            value={refEmail}
            onChange={(e) => setRefEmail(e.target.value)}
            required
            placeholder="referido@ejemplo.com"
            className="min-w-[200px]"
          />
          <Input
            label="Nombre"
            value={refFirstName}
            onChange={(e) => setRefFirstName(e.target.value)}
            required
            placeholder="Juan"
            className="min-w-[140px]"
          />
          <Input
            label="Apellido"
            value={refLastName}
            onChange={(e) => setRefLastName(e.target.value)}
            required
            placeholder="González"
            className="min-w-[140px]"
          />
          <Button type="submit" disabled={createReferrerMutation.isPending}>
            {createReferrerMutation.isPending ? 'Creando…' : 'Crear referido'}
          </Button>
        </form>
      </section>

      <ul className="mt-6 space-y-3">
        {events.map((ev) => (
          <li key={ev.id}>
            <Link
              href={`/producer/events/${ev.id}/referrals`}
              className="block rounded-lg border border-border bg-bg-muted p-4 transition-colors hover:border-accent"
            >
              <p className="font-medium text-text">{ev.title}</p>
              <p className="text-sm text-text-muted">
                {ev.city ?? ev.venueName ?? '—'} · Ver y crear links de referidos
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {events.length === 0 && (
        <p className="mt-6 text-text-muted">No tenés eventos. Creá uno desde Eventos.</p>
      )}
    </PageContainer>
  );
}
