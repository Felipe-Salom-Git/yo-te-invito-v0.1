'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ScannerLoginForm } from '@/components/ScannerLoginForm';
import { useScannerSession } from '@/hooks/use-scanner-session';

export function ScannerHomeClient() {
  const router = useRouter();
  const { session, hydrated, saveSession } = useScannerSession();

  useEffect(() => {
    if (hydrated && session) {
      router.replace('/door');
    }
  }, [hydrated, session, router]);

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-slate-400">Cargando…</p>
      </main>
    );
  }

  if (session) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white">Yo Te Invito — Scanner</h1>
        <p className="mt-2 text-sm text-slate-400">
          Ingresá con tu cuenta scanner para validar entradas y descuentos en puerta.
        </p>
      </div>
      <ScannerLoginForm onSuccess={saveSession} />
    </main>
  );
}
