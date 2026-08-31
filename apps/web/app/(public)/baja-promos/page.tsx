'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, Card, CardContent, CardHeader } from '@/components';
import { Logo } from '@/components/brand/Logo';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

type PageState =
  | { kind: 'loading' }
  | { kind: 'invalid' }
  | { kind: 'already_unsubscribed' }
  | { kind: 'confirm' }
  | { kind: 'success' }
  | { kind: 'error' };

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');
  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setState({ kind: 'invalid' });
      return;
    }
    fetch(`${API_BASE}/public/marketing/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          setState({ kind: 'invalid' });
          return;
        }
        const data = (await res.json()) as {
          emailOptIn?: boolean;
          alreadyUnsubscribed?: boolean;
        };
        if (data.alreadyUnsubscribed || data.emailOptIn === false) {
          setState({ kind: 'already_unsubscribed' });
          return;
        }
        setState({ kind: 'confirm' });
      })
      .catch(() => setState({ kind: 'error' }));
  }, [token]);

  const confirmUnsubscribe = useCallback(async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE}/public/marketing/unsubscribe?token=${encodeURIComponent(token)}`,
        { method: 'POST' },
      );
      setState(res.ok ? { kind: 'success' } : { kind: 'error' });
    } catch {
      setState({ kind: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [token]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 p-8">
      <Logo variant="auth" showText />
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-xl font-semibold text-text">Emails promocionales</h1>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.kind === 'loading' ? (
            <p className="text-text-muted">Cargando…</p>
          ) : null}
          {state.kind === 'confirm' ? (
            <>
              <p className="text-text">
                ¿Querés dejar de recibir novedades y promociones por email de Yo Te Invito?
              </p>
              <Button className="w-full" onClick={confirmUnsubscribe} disabled={submitting}>
                {submitting ? 'Procesando…' : 'Dejar de recibir promociones'}
              </Button>
            </>
          ) : null}
          {state.kind === 'success' || state.kind === 'already_unsubscribed' ? (
            <p className="text-text">Has dejado de recibir emails promocionales de Yo Te Invito.</p>
          ) : null}
          {state.kind === 'invalid' ? (
            <p className="text-text">Este enlace no es válido o ya no está vigente.</p>
          ) : null}
          {state.kind === 'error' ? (
            <p className="text-text">No pudimos procesar tu solicitud. Intentá de nuevo más tarde.</p>
          ) : null}
          <p className="text-sm text-text-muted">
            Seguirás recibiendo emails de cuenta (verificación, tickets, reclamos QR).
          </p>
          <Link href="/me/account" className="mt-2 block">
            <Button variant="secondary" className="w-full">
              Gestionar preferencias
            </Button>
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
