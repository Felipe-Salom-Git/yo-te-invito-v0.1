'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, Card, CardContent, CardHeader } from '@/components';
import { Logo } from '@/components/brand/Logo';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    fetch(
      `${API_BASE}/public/marketing/unsubscribe?token=${encodeURIComponent(token)}`,
      { method: 'POST' },
    )
      .then(async (res) => {
        setStatus(res.ok ? 'success' : 'error');
      })
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 p-8">
      <Logo variant="auth" showText />
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-xl font-semibold text-text">Emails promocionales</h1>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' ? <p className="text-text-muted">Procesando tu solicitud…</p> : null}
          {status === 'success' ? (
            <p className="text-text">Has dejado de recibir emails promocionales de Yo Te Invito.</p>
          ) : null}
          {status === 'error' ? (
            <p className="text-text">Este enlace no es válido o ya no está vigente.</p>
          ) : null}
          <p className="text-sm text-text-muted">
            Seguirás recibiendo emails de cuenta (verificación, tickets, reclamos QR).
          </p>
          <Link href="/me/account" className="mt-2 block">
            <Button className="w-full">Gestionar preferencias</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MarketingUnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-text-muted">
          Cargando…
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
