'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ProfileSelector } from '@/components/account/ProfileSelector';
import { Logo } from '@/components/brand/Logo';

export default function ProfilesPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 p-8">
        <p className="text-text-muted">Cargando…</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 p-8">
        <Logo variant="auth" showText />
        <p className="text-text-muted">Debes iniciar sesión para ver tus perfiles.</p>
        <Link href="/login" className="rounded border border-accent px-4 py-2 text-accent hover:bg-accent/10">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col px-4 py-12">
      <Link href="/home" className="mb-6 inline-block text-sm text-text-muted hover:text-text">
        ← Volver al inicio
      </Link>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
          Elegí tu perfil
        </h1>
        <p className="mt-3 text-base text-text-muted">
          Accedé a la experiencia que necesitás según cómo quieras usar la plataforma hoy.
        </p>
      </div>
      <ProfileSelector />
    </div>
  );
}
