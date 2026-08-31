'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DoorScannerClient } from '@/components/DoorScannerClient';
import { useScannerSession } from '@/hooks/use-scanner-session';

export function ScannerDoorPageClient() {
  const router = useRouter();
  const { session, hydrated, logout } = useScannerSession();

  useEffect(() => {
    if (hydrated && !session) {
      router.replace('/');
    }
  }, [hydrated, session, router]);

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-slate-400">Cargando…</p>
      </main>
    );
  }

  if (!session) return null;

  return (
    <DoorScannerClient
      userLabel={`${session.user.firstName} ${session.user.lastName}`.trim()}
      userEmail={session.user.username ?? session.user.email ?? ''}
      onLogout={() => {
        logout();
        router.replace('/');
      }}
    />
  );
}
