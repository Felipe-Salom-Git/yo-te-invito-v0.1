'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { Button, Input, Card, CardHeader, CardContent } from '@/components';
import { Logo } from '@/components/brand/Logo';
import { getErrorMessage } from '@/lib/errors';

const schema = z
  .object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirmPassword: z.string(),
    firstName: z.string().min(1, 'Nombre requerido'),
    lastName: z.string().min(1, 'Apellido requerido'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const form = e.currentTarget;
    const fd = new FormData(form);
    const formData: FormData = {
      email: (fd.get('email') as string) ?? '',
      password: (fd.get('password') as string) ?? '',
      confirmPassword: (fd.get('confirmPassword') as string) ?? '',
      firstName: (fd.get('firstName') as string) ?? '',
      lastName: (fd.get('lastName') as string) ?? '',
    };

    const result = schema.safeParse(formData);
    if (!result.success) {
      const errs: Partial<Record<keyof FormData, string>> = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0] as keyof FormData;
        if (path && !errs[path]) errs[path] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    const { confirmPassword: _, ...body } = result.data;

    try {
      const url = `${API_BASE}/auth/register`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, tenantId: 'tenant-demo' }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.message ?? data?.error ?? 'Error al registrarse');
        return;
      }

      router.push('/login?registered=1');
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 p-8">
      <Logo variant="auth" showText />
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-xl font-semibold text-text">Crear cuenta</h1>
          <p className="text-sm text-text-muted">
            Registrate para comprar tickets y ver tus entradas
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nombre"
                name="firstName"
                type="text"
                required
                placeholder="Juan"
                error={fieldErrors.firstName}
              />
              <Input
                label="Apellido"
                name="lastName"
                type="text"
                required
                placeholder="Pérez"
                error={fieldErrors.lastName}
              />
            </div>
            <Input
              label="Email"
              name="email"
              type="email"
              required
              placeholder="tu@email.com"
              error={fieldErrors.email}
            />
            <Input
              label="Contraseña"
              name="password"
              type="password"
              required
              placeholder="Mínimo 6 caracteres"
              error={fieldErrors.password}
            />
            <Input
              label="Confirmar contraseña"
              name="confirmPassword"
              type="password"
              required
              placeholder="Repetí tu contraseña"
              error={fieldErrors.confirmPassword}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" className="w-full">
              Crear cuenta
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-text-muted">
            ¿Ya tenés cuenta?{' '}
            <Link href="/login" className="text-accent hover:underline">
              Iniciar sesión
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-text-muted">
            ¿Productor o gastro?{' '}
            <Link href="/register/producer" className="text-accent hover:underline">Productora</Link>
            {' · '}
            <Link href="/register/gastro" className="text-accent hover:underline">Gastro</Link>
          </p>
          <p className="mt-2 text-center text-sm text-text-muted">
            <Link href="/home" className="text-accent hover:underline">
              ← Volver al inicio
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
