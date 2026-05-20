'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Card, CardContent } from '@/components';

export default function CuentaPage() {
  const { data: session, status } = useSession();
  const repos = useRepositories();
  const userId = (session?.user as { userId?: string })?.userId ?? (session?.user as { id?: string })?.id ?? '';

  const { data: user } = useQuery({
    queryKey: ['user', 'me', userId],
    queryFn: () => repos.users.getMe(userId),
    enabled: !!userId,
  });

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
        <p className="text-text-muted">Debes iniciar sesión.</p>
        <Link href="/login" className="mt-4 block text-accent hover:underline">Iniciar sesión</Link>
      </PageContainer>
    );
  }

  const name = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || session.user.name : session.user.name;
  const producerAccess = user?.availableProfiles?.producer?.hasAccess ?? false;
  const hasProducerProfiles = (user?.availableProfiles?.producer?.profiles?.length ?? 0) > 0;
  const canRequestProducer = !producerAccess && !hasProducerProfiles;

  return (
    <PageContainer>
      <Link href="/home" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Volver
      </Link>
      <SectionTitle>Mi cuenta</SectionTitle>
      <Card className="mt-6">
        <CardContent>
          {name && <p className="font-medium text-text">{name}</p>}
          <p className="text-text-muted">Email</p>
          <p className="font-medium text-text">{session.user.email ?? '—'}</p>
          <p className="mt-4 text-sm text-text-muted">
            Configurá tu perfil, preferencias e historial desde el menú.
          </p>
        </CardContent>
      </Card>
      {canRequestProducer && (
        <Card className="mt-6">
          <CardContent>
            <h3 className="font-medium text-text">¿Sos productor de eventos?</h3>
            <p className="mt-2 text-sm text-text-muted">
              Creá tu perfil de productor para publicar eventos al instante.
            </p>
            <Link href="/cuenta/solicitar-productor" className="mt-4 inline-block">
              <span className="rounded border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-accent/10 transition-colors">
                Crear perfil productor
              </span>
            </Link>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
