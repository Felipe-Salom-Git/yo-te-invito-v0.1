'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardContent, Button } from '@/components';
import { Logo } from '@/components/brand/Logo';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Falta el token de verificación');
      return;
    }
    fetch(`${API_BASE}/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.verified) {
          setStatus('success');
          setMessage(data.message ?? 'Email verificado correctamente');
        } else {
          setStatus('error');
          setMessage(data.message ?? 'Token inválido o expirado');
        }
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err?.message ?? 'Error al verificar');
      });
  }, [token]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 p-8">
      <Logo variant="auth" showText />
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-xl font-semibold text-text">Verificación de email</h1>
        </CardHeader>
        <CardContent>
          {status === 'loading' && (
            <p className="text-text-muted">Verificando…</p>
          )}
          {status === 'success' && (
            <>
              <p className="text-accent-soft">{message}</p>
              <Link href="/login?verify=1" className="mt-4 block">
                <Button className="w-full">Iniciar sesión</Button>
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <p className="text-red-400">{message}</p>
              <Link href="/register" className="mt-4 block">
                <Button variant="outline" className="w-full">Crear cuenta</Button>
              </Link>
            </>
          )}
          <p className="mt-4 text-center text-sm text-text-muted">
            <Link href="/home" className="text-accent hover:underline">← Volver al inicio</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><p className="text-text-muted">Cargando…</p></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
