'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ScannerBrandHeader } from '@/components/ScannerBrandHeader';
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
      <main className="flex min-h-screen items-center justify-center bg-scanner-bg p-6">
        <p className="text-scanner-muted">Cargando…</p>
      </main>
    );
  }

  if (session) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-scanner-bg p-6">
      <div className="mb-8">
        <ScannerBrandHeader />
      </div>
      <ScannerLoginForm onSuccess={saveSession} />
    </main>
  );
}
