'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { Button, Input, Card, CardHeader, CardContent } from '@/components';
import { Logo } from '@/components/brand/Logo';
import { getErrorMessage } from '@/lib/errors';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string(),
  firstName: z.string().min(1, 'Nombre requerido'),
  lastName: z.string().min(1, 'Apellido requerido'),
  phone: z.string().optional(),
  businessName: z.string().optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export default function RegisterGastroPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const fd = new FormData(e.currentTarget);
    const formData: FormData = {
      email: (fd.get('email') as string) ?? '',
      password: (fd.get('password') as string) ?? '',
      confirmPassword: (fd.get('confirmPassword') as string) ?? '',
      firstName: (fd.get('firstName') as string) ?? '',
      lastName: (fd.get('lastName') as string) ?? '',
      phone: (fd.get('phone') as string) || undefined,
      businessName: (fd.get('businessName') as string) || undefined,
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
      const url = `${API_BASE}/auth/apply-role`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, role: 'GASTRO_OWNER', tenantId: 'tenant-demo' }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.message ?? data?.error ?? 'Error al enviar la solicitud');
        return;
      }

      router.push('/register/gastro/success');
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
          <h1 className="text-xl font-semibold text-text">Solicitar cuenta gastro</h1>
          <p className="text-sm text-text-muted">
            Completa el formulario. Un admin revisará tu solicitud.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Nombre" name="firstName" required placeholder="Juan" error={fieldErrors.firstName} />
              <Input label="Apellido" name="lastName" required placeholder="Pérez" error={fieldErrors.lastName} />
            </div>
            <Input label="Email" name="email" type="email" required placeholder="tu@email.com" error={fieldErrors.email} />
            <Input label="Nombre del local / negocio" name="businessName" placeholder="Mi Restaurante" error={fieldErrors.businessName} />
            <Input label="Teléfono" name="phone" type="tel" placeholder="+54 11 1234-5678" error={fieldErrors.phone} />
            <Input label="Contraseña" name="password" type="password" required placeholder="Mínimo 6 caracteres" error={fieldErrors.password} />
            <Input label="Confirmar contraseña" name="confirmPassword" type="password" required error={fieldErrors.confirmPassword} />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" className="w-full">Enviar solicitud</Button>
          </form>
          <p className="mt-4 text-center text-sm text-text-muted">
            <Link href="/home" className="text-accent hover:underline">← Volver al inicio</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
