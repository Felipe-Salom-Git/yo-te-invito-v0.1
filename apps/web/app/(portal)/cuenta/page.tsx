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
    </PageContainer>
  );
}
