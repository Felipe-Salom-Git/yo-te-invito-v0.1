'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gastroProfileApplySchema } from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { useMe } from '@/hooks/useMe';
import { PageContainer, SectionTitle, Card, CardContent, Button, Input, useToast } from '@/components';
import { GastroProvinceCityFields } from '@/components/location/GastroProvinceCityFields';
import { getErrorMessage } from '@/lib/errors';
import { REGISTER_WIZARD_COPY } from '@/components/auth/register/register-wizard-copy';
import { RegisterResponsibilityCallout } from '@/components/auth/register/RegisterResponsibilityCallout';

export default function SolicitarGastroPage() {
  const repos = useRepositories();
  const router = useRouter();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useMe();
  const gastroCopy = REGISTER_WIZARD_COPY.gastro;

  const [displayName, setDisplayName] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email ?? '');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [legalName, setLegalName] = useState('');
  const [summary, setSummary] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const parsed = gastroProfileApplySchema.safeParse({
        displayName: displayName.trim(),
        contactEmail: contactEmail.trim(),
        location: {
          province: province.trim(),
          city: city.trim(),
          address: address.trim(),
        },
        summary: summary.trim() || undefined,
        legalName: legalName.trim() || undefined,
      });
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        throw new Error(first?.message ?? 'Revisá los datos del formulario');
      }
      return repos.profiles.applyGastro(parsed.data);
    },
    onSuccess: (data) => {
      addToast(data.message ?? 'Perfil creado', 'success');
      queryClient.invalidateQueries({ queryKey: ['me'] });
      router.push('/profiles');
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <PageContainer>
      <Link href="/profiles" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Volver a perfiles
      </Link>
      <SectionTitle>Crear perfil gastronómico</SectionTitle>
      <p className="mt-2 text-text-muted">{gastroCopy.intro}</p>
      <p className="mt-2 text-sm text-text-muted">
        Los mismos datos mínimos que en el registro público. Los tickets de descuento siguen
        requiriendo aprobación de administración.
      </p>
      <Card className="mt-6">
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={`${gastroCopy.displayNameLabel} *`}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={gastroCopy.displayNamePlaceholder}
              required
            />
            <div>
              <Input
                label={`${gastroCopy.contactEmailLabel} *`}
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
              />
              <p className="mt-1.5 text-xs text-text-muted">{gastroCopy.contactEmailHint}</p>
            </div>

            <GastroProvinceCityFields
              values={{ province, city, address }}
              onChange={(patch) => {
                if (patch.province !== undefined) setProvince(patch.province);
                if (patch.city !== undefined) setCity(patch.city);
                if (patch.address !== undefined) setAddress(patch.address);
              }}
              copy={gastroCopy}
              disabled={mutation.isPending}
            />

            <div className="rounded-xl border border-border/60 bg-bg-muted/30 px-4 py-3 text-sm text-text-muted">
              <p>{gastroCopy.portalHint}</p>
            </div>
            <RegisterResponsibilityCallout profileKey="GASTRO" />

            <details className="rounded-lg border border-border/60 px-3 py-2 text-sm">
              <summary className="cursor-pointer font-medium text-text">
                Datos opcionales (razón social, resumen)
              </summary>
              <div className="mt-3 space-y-3">
                <Input
                  label="Razón social (opcional)"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Nombre legal del negocio"
                />
                <div>
                  <label htmlFor="summary" className="mb-1 block text-sm font-medium text-text">
                    Resumen (opcional)
                  </label>
                  <textarea
                    id="summary"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    rows={2}
                    className="w-full rounded border border-border bg-bg px-3 py-2 text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
            </details>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Button type="submit" disabled={mutation.isPending} className="min-h-11">
                {mutation.isPending ? 'Creando…' : 'Crear perfil'}
              </Button>
              <Link href="/profiles">
                <Button variant="outline" type="button" className="min-h-11 w-full sm:w-auto">
                  Cancelar
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
