'use client';

import Link from 'next/link';
import { Breadcrumbs } from '@/components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, useToast, Button, EmptyState } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import type { PendingProducerProfile } from '@/repositories/interfaces';

function ProfileSection({
  title,
  profiles,
  isLoading,
  onApprove,
  isApproving,
}: {
  title: string;
  profiles: PendingProducerProfile[];
  isLoading: boolean;
  onApprove: (id: string) => void;
  isApproving: boolean;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-text">{title}</h2>
      {isLoading ? (
        <p className="mt-2 text-sm text-text-muted">Cargando…</p>
      ) : profiles.length === 0 ? (
        <EmptyState title="Sin solicitudes pendientes" />
      ) : (
        <ul className="mt-4 space-y-3">
          {profiles.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-bg-muted p-4"
            >
              <div>
                <p className="font-medium text-text">{p.displayName}</p>
                <p className="text-xs text-text-muted">
                  Creado: {typeof p.createdAt === 'string' ? p.createdAt : new Date(p.createdAt).toLocaleString()}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => onApprove(p.id)}
                disabled={isApproving}
              >
                Aprobar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AdminPerfilesPage() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const {
    data: producerData,
    isLoading: producerLoading,
  } = useQuery({
    queryKey: ['profiles', 'producer', 'pending'],
    queryFn: () => repos.profiles.listPendingProducerProfiles(),
  });
  const {
    data: gastroData,
    isLoading: gastroLoading,
  } = useQuery({
    queryKey: ['profiles', 'gastro', 'pending'],
    queryFn: () => repos.profiles.listPendingGastroProfiles(),
  });
  const {
    data: referrerData,
    isLoading: referrerLoading,
  } = useQuery({
    queryKey: ['profiles', 'referrer', 'pending'],
    queryFn: () => repos.profiles.listPendingReferrerProfiles(),
  });

  const producerProfiles = producerData?.profiles ?? [];
  const gastroProfiles = gastroData?.profiles ?? [];
  const referrerProfiles = referrerData?.profiles ?? [];

  const approveProducer = useMutation({
    mutationFn: (id: string) => repos.profiles.approveProducerProfile(id),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });
  const approveGastro = useMutation({
    mutationFn: (id: string) => repos.profiles.approveGastroProfile(id),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });
  const approveReferrer = useMutation({
    mutationFn: (id: string) => repos.profiles.approveReferrerProfile(id),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });

  return (
    <PageContainer>
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Perfiles pendientes' }]} />
      <SectionTitle>Perfiles pendientes de aprobación</SectionTitle>
      <p className="mt-2 text-text-muted">
        Solicitudes de perfiles productor, gastro y referidor.
      </p>

      <ProfileSection
        title="Productores"
        profiles={producerProfiles}
        isLoading={producerLoading}
        onApprove={(id) => approveProducer.mutate(id)}
        isApproving={approveProducer.isPending}
      />
      <ProfileSection
        title="Gastronomía"
        profiles={gastroProfiles}
        isLoading={gastroLoading}
        onApprove={(id) => approveGastro.mutate(id)}
        isApproving={approveGastro.isPending}
      />
      <ProfileSection
        title="Referidores"
        profiles={referrerProfiles}
        isLoading={referrerLoading}
        onApprove={(id) => approveReferrer.mutate(id)}
        isApproving={approveReferrer.isPending}
      />
    </PageContainer>
  );
}
