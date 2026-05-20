'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { z } from 'zod';
import { Button, Input, Card, CardHeader, CardContent } from '@/components';
import { Logo } from '@/components/brand/Logo';
import { useRepositories } from '@/repositories/context';
import { getErrorMessage } from '@/lib/errors';
import type { RegistrationProfileType } from '@yo-te-invito/shared';

const accountSchema = z
  .object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirmPassword: z.string(),
    firstName: z.string().min(1, 'Nombre requerido'),
    lastName: z.string().min(1, 'Apellido requerido'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type AccountData = z.infer<typeof accountSchema>;

const PROFILE_CHOICES: {
  type: RegistrationProfileType;
  title: string;
  description: string;
}[] = [
  {
    type: 'USER',
    title: 'Mis Tickets',
    description: 'Comprá entradas y gestioná tu actividad personal.',
  },
  {
    type: 'PRODUCER',
    title: 'Productor',
    description: 'Creá y publicá eventos con tu productora.',
  },
  {
    type: 'GASTRO',
    title: 'Gastronómico',
    description: 'Gestioná tu local y tickets de descuento (los descuentos requieren aprobación admin).',
  },
  {
    type: 'HOTEL',
    title: 'Hotel / alojamiento',
    description: 'Mostrá tu establecimiento en la plataforma.',
  },
  {
    type: 'REFERRER',
    title: 'Referido',
    description: 'Panel comercial para referir productoras (siempre con acceso a Mis Tickets).',
  },
];

function redirectForProfile(type: RegistrationProfileType): string {
  switch (type) {
    case 'PRODUCER':
      return '/producer';
    case 'GASTRO':
      return '/gastro';
    case 'HOTEL':
      return '/hotel';
    case 'REFERRER':
      return '/referrer';
    default:
      return '/cuenta';
  }
}

export function RegisterWizard() {
  const router = useRouter();
  const repos = useRepositories();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [account, setAccount] = useState<AccountData | null>(null);
  const [profileType, setProfileType] = useState<RegistrationProfileType>('USER');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});

  const handleAccountSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const raw = {
      email: String(fd.get('email') ?? ''),
      password: String(fd.get('password') ?? ''),
      confirmPassword: String(fd.get('confirmPassword') ?? ''),
      firstName: String(fd.get('firstName') ?? ''),
      lastName: String(fd.get('lastName') ?? ''),
    };
    const parsed = accountSchema.safeParse(raw);
    if (!parsed.success) {
      const errs: Partial<Record<string, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setAccount(parsed.data);
    setStep(2);
  };

  const handleProfileFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!account) return;
    setError(null);
    setSubmitting(true);

    let data: unknown;
    if (profileType === 'PRODUCER') {
      const fd = new FormData(e.currentTarget);
      data = {
        displayName: String(fd.get('displayName') ?? '').trim(),
        description: String(fd.get('description') ?? '').trim() || undefined,
        city: String(fd.get('city') ?? '').trim() || undefined,
      };
    } else if (profileType === 'GASTRO') {
      const fd = new FormData(e.currentTarget);
      const lat = parseFloat(String(fd.get('lat') ?? '0'));
      const lng = parseFloat(String(fd.get('lng') ?? '0'));
      data = {
        displayName: String(fd.get('displayName') ?? '').trim(),
        summary: String(fd.get('summary') ?? '').trim() || undefined,
        contactEmail: String(fd.get('contactEmail') ?? account.email).trim(),
        location: {
          province: String(fd.get('province') ?? '').trim(),
          city: String(fd.get('city') ?? '').trim(),
          address: String(fd.get('address') ?? '').trim(),
          lat: Number.isFinite(lat) ? lat : -34.6,
          lng: Number.isFinite(lng) ? lng : -58.38,
        },
      };
    } else if (profileType === 'HOTEL') {
      const fd = new FormData(e.currentTarget);
      data = {
        displayName: String(fd.get('displayName') ?? '').trim(),
        websiteUrl: String(fd.get('websiteUrl') ?? '').trim(),
        description: String(fd.get('description') ?? '').trim() || undefined,
        city: String(fd.get('city') ?? '').trim() || undefined,
      };
    } else if (profileType === 'REFERRER') {
      const fd = new FormData(e.currentTarget);
      data = {
        displayName: String(fd.get('displayName') ?? '').trim(),
        bio: String(fd.get('bio') ?? '').trim() || undefined,
        city: String(fd.get('city') ?? '').trim() || undefined,
      };
    }

    try {
      await repos.auth.register({
        email: account.email,
        password: account.password,
        firstName: account.firstName,
        lastName: account.lastName,
        tenantId: 'tenant-demo',
        profileType,
        profileData: profileType === 'USER' ? undefined : data,
      });

      const signInResult = await signIn('credentials', {
        email: account.email,
        password: account.password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError('Cuenta creada. Iniciá sesión con tu email y contraseña.');
        router.push('/login?registered=1');
        return;
      }

      router.push(redirectForProfile(profileType));
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const finishUserOnly = async () => {
    if (!account) return;
    setSubmitting(true);
    setError(null);
    try {
      await repos.auth.register({
        email: account.email,
        password: account.password,
        firstName: account.firstName,
        lastName: account.lastName,
        tenantId: 'tenant-demo',
        profileType: 'USER',
      });
      const signInResult = await signIn('credentials', {
        email: account.email,
        password: account.password,
        redirect: false,
      });
      if (signInResult?.error) {
        router.push('/login?registered=1');
        return;
      }
      router.push('/cuenta');
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 p-8">
      <Logo variant="auth" showText />
      <Card className="w-full max-w-lg">
        <CardHeader>
          <h1 className="text-xl font-semibold text-text">Crear cuenta</h1>
          <p className="text-sm text-text-muted">
            {step === 1 && 'Paso 1 de 3 — Datos de acceso'}
            {step === 2 && 'Paso 2 de 3 — Elegí tu perfil'}
            {step === 3 && 'Paso 3 de 3 — Completá tu perfil'}
          </p>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Nombre" name="firstName" required error={fieldErrors.firstName} />
                <Input label="Apellido" name="lastName" required error={fieldErrors.lastName} />
              </div>
              <Input label="Email" name="email" type="email" required error={fieldErrors.email} />
              <Input
                label="Contraseña"
                name="password"
                type="password"
                required
                error={fieldErrors.password}
              />
              <Input
                label="Confirmar contraseña"
                name="confirmPassword"
                type="password"
                required
                error={fieldErrors.confirmPassword}
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" className="w-full">
                Continuar
              </Button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {PROFILE_CHOICES.map((choice) => (
                <button
                  key={choice.type}
                  type="button"
                  onClick={() => {
                    setProfileType(choice.type);
                    if (choice.type === 'USER') {
                      void finishUserOnly();
                    } else {
                      setStep(3);
                    }
                  }}
                  disabled={submitting}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${
                    profileType === choice.type
                      ? 'border-accent bg-accent/10'
                      : 'border-border bg-bg-muted/40 hover:border-accent/50'
                  }`}
                >
                  <p className="font-medium text-text">{choice.title}</p>
                  <p className="mt-1 text-sm text-text-muted">{choice.description}</p>
                </button>
              ))}
              <Button type="button" variant="outline" className="w-full" onClick={() => setStep(1)}>
                ← Volver
              </Button>
              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>
          )}

          {step === 3 && account && profileType !== 'USER' && (
            <form onSubmit={handleProfileFormSubmit} className="space-y-4">
              {profileType === 'PRODUCER' && (
                <>
                  <Input label="Nombre de la productora *" name="displayName" required />
                  <Input label="Ciudad" name="city" />
                  <div>
                    <label className="mb-1 block text-sm text-text-muted">Descripción</label>
                    <textarea
                      name="description"
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                      rows={3}
                    />
                  </div>
                </>
              )}
              {profileType === 'GASTRO' && (
                <>
                  <Input label="Nombre del local *" name="displayName" required />
                  <Input label="Resumen" name="summary" />
                  <Input label="Email de contacto *" name="contactEmail" defaultValue={account.email} />
                  <Input label="Provincia *" name="province" required />
                  <Input label="Ciudad *" name="city" required />
                  <Input label="Dirección *" name="address" required />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Latitud" name="lat" defaultValue="-34.6037" />
                    <Input label="Longitud" name="lng" defaultValue="-58.3816" />
                  </div>
                </>
              )}
              {profileType === 'HOTEL' && (
                <>
                  <Input label="Nombre del establecimiento *" name="displayName" required />
                  <Input label="Sitio web (https://) *" name="websiteUrl" required placeholder="https://..." />
                  <Input label="Ciudad" name="city" />
                  <div>
                    <label className="mb-1 block text-sm text-text-muted">Descripción</label>
                    <textarea
                      name="description"
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                      rows={3}
                    />
                  </div>
                </>
              )}
              {profileType === 'REFERRER' && (
                <>
                  <Input label="Nombre público *" name="displayName" required />
                  <Input label="Ciudad" name="city" />
                  <div>
                    <label className="mb-1 block text-sm text-text-muted">Bio</label>
                    <textarea
                      name="bio"
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                      rows={2}
                    />
                  </div>
                  <p className="text-xs text-text-muted">
                    El handle y link público se generan automáticamente.
                  </p>
                </>
              )}
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(2)} disabled={submitting}>
                  ← Volver
                </Button>
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
      <p className="text-center text-sm text-text-muted">
        ¿Ya tenés cuenta?{' '}
        <Link href="/login" className="text-accent hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
