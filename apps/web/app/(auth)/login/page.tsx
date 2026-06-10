'use client';

import { useState, Suspense } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Role } from '@yo-te-invito/shared';
import { Button, Input, Card, CardHeader, CardContent } from '@/components';
import { Logo } from '@/components/brand/Logo';
import { resolvePostLoginHref } from '@/lib/navigation/rolePortalHome';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const registered = searchParams?.get('registered') === '1';
  const verify = searchParams?.get('verify') === '1';
  const callbackUrl = searchParams?.get('callbackUrl');

  async function navigateAfterLogin() {
    const session = await getSession();
    const email = session?.user?.email ?? null;
    const role = (session?.user as { role?: Role } | undefined)?.role;
    const href = resolvePostLoginHref({ callbackUrl, email, role });
    router.push(href);
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = (formData.get('email') as string)?.trim()?.toLowerCase() ?? '';
    const password = (formData.get('password') as string) ?? '';

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError('Email o contraseña incorrectos.');
      return;
    }

    await navigateAfterLogin();
  }

  function handleGoogleSignIn() {
    const href = resolvePostLoginHref({ callbackUrl });
    void signIn('google', { callbackUrl: href });
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 p-8">
      <Logo variant="auth" showText />
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-xl font-semibold text-text">Iniciar sesión</h1>
          <p className="text-sm text-text-muted">Ingresá con el email y la contraseña de tu cuenta.</p>
        </CardHeader>
        <CardContent>
          {registered && (
            <p className="mb-4 rounded border border-accent-muted bg-accent-surface/70 px-3 py-2 text-sm text-accent-soft">
              Cuenta creada. Revisá tu email para verificar tu cuenta e iniciar sesión.
            </p>
          )}
          {verify && (
            <p className="mb-4 rounded border border-accent-muted bg-accent-surface/70 px-3 py-2 text-sm text-accent-soft">
              Email verificado. Iniciá sesión.
            </p>
          )}
          {process.env.NEXT_PUBLIC_GOOGLE_ENABLED === 'true' && (
            <div className="mb-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="flex w-full items-center justify-center gap-2 rounded border border-border bg-bg-muted px-4 py-2 text-text hover:bg-border transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar con Google
              </button>
              <p className="mt-2 text-center text-xs text-text-muted">o</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email" name="email" type="email" required placeholder="you@example.com" />
            <Input label="Password" name="password" type="password" required />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" className="w-full">
              Iniciar sesión
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-text-muted">
            ¿No tenés cuenta?{' '}
            <Link href="/register" className="text-accent hover:underline">
              Crear cuenta
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-text-muted">
            <Link href="/home" className="text-accent hover:underline">
              ← Back to home
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><p className="text-text-muted">Loading…</p></div>}>
      <LoginForm />
    </Suspense>
  );
}
