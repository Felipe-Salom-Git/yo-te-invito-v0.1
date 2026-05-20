'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProducerDetail } from '@/repositories/interfaces';
import { useRepositories } from '@/repositories/context';
import { producersKeys } from '@/lib/query/keys';
import { PageContainer, Button, Input, useToast, SectionTitle } from '@/components';
import { getErrorMessage } from '@/lib/errors';

function invalidateProducerProfile(
  queryClient: ReturnType<typeof useQueryClient>,
  profile: ProducerDetail,
) {
  queryClient.invalidateQueries({ queryKey: producersKeys.myProfile() });
  queryClient.invalidateQueries({ queryKey: producersKeys.detail(profile.id) });
  if (profile.slug?.trim()) {
    queryClient.invalidateQueries({ queryKey: producersKeys.detail(profile.slug.trim()) });
  }
}

export function ProducerContactForm({ profile }: { profile: ProducerDetail }) {
  const repos = useRepositories();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const links = (profile.socialLinks ?? {}) as { website?: string; instagram?: string };

  const [primaryPhone, setPrimaryPhone] = useState(profile.primaryPhone ?? '');
  const [secondaryPhone, setSecondaryPhone] = useState(profile.secondaryPhone ?? '');
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp ?? '');
  const [primaryEmail, setPrimaryEmail] = useState(profile.primaryEmail ?? '');
  const [secondaryEmail, setSecondaryEmail] = useState(profile.secondaryEmail ?? '');
  const [city, setCity] = useState(profile.city ?? '');
  const [country, setCountry] = useState(profile.country ?? '');
  const [website, setWebsite] = useState(profile.websiteUrl ?? links.website ?? '');
  const [instagram, setInstagram] = useState(profile.instagramUrl ?? links.instagram ?? '');

  useEffect(() => {
    const l = (profile.socialLinks ?? {}) as { website?: string; instagram?: string };
    setPrimaryPhone(profile.primaryPhone ?? '');
    setSecondaryPhone(profile.secondaryPhone ?? '');
    setWhatsapp(profile.whatsapp ?? '');
    setPrimaryEmail(profile.primaryEmail ?? '');
    setSecondaryEmail(profile.secondaryEmail ?? '');
    setCity(profile.city ?? '');
    setCountry(profile.country ?? '');
    setWebsite(profile.websiteUrl ?? l.website ?? '');
    setInstagram(profile.instagramUrl ?? l.instagram ?? '');
  }, [profile]);

  const mutation = useMutation({
    mutationFn: () =>
      repos.producers.updateMyProfileContact({
        ...(primaryPhone.trim() ? { primaryPhone: primaryPhone.trim() } : { primaryPhone: undefined }),
        ...(secondaryPhone.trim() ? { secondaryPhone: secondaryPhone.trim() } : { secondaryPhone: undefined }),
        ...(whatsapp.trim() ? { whatsapp: whatsapp.trim() } : { whatsapp: undefined }),
        ...(primaryEmail.trim() ? { primaryEmail: primaryEmail.trim() } : { primaryEmail: undefined }),
        ...(secondaryEmail.trim() ? { secondaryEmail: secondaryEmail.trim() } : { secondaryEmail: undefined }),
        ...(city.trim() ? { city: city.trim() } : { city: undefined }),
        ...(country.trim() ? { country: country.trim() } : { country: undefined }),
        socialLinks: {
          ...(website.trim() ? { website: website.trim() } : {}),
          ...(instagram.trim() ? { instagram: instagram.trim() } : {}),
        },
      }),
    onSuccess: (updated) => {
      addToast('Contacto guardado', 'success');
      invalidateProducerProfile(queryClient, updated);
      router.push('/producer/profile');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hasContact =
      primaryPhone.trim() ||
      secondaryPhone.trim() ||
      whatsapp.trim() ||
      primaryEmail.trim() ||
      secondaryEmail.trim() ||
      website.trim() ||
      instagram.trim();
    if (!hasContact) {
      addToast('Indicá al menos un teléfono o email de contacto', 'error');
      return;
    }
    mutation.mutate();
  };

  return (
    <PageContainer className="max-w-2xl">
      <Link href="/producer/profile" className="text-sm text-text-muted hover:text-accent">
        ← Volver al perfil
      </Link>
      <SectionTitle className="mt-4">Contacto</SectionTitle>
      <p className="mt-2 text-sm text-text-muted">Datos públicos para que te escriban o llamen.</p>

      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Teléfono" value={primaryPhone} onChange={(e) => setPrimaryPhone(e.target.value)} />
          <Input label="Teléfono alternativo" value={secondaryPhone} onChange={(e) => setSecondaryPhone(e.target.value)} />
          <Input label="WhatsApp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          <Input
            label="Email"
            type="email"
            value={primaryEmail}
            onChange={(e) => setPrimaryEmail(e.target.value)}
          />
          <Input
            label="Email alternativo"
            type="email"
            value={secondaryEmail}
            onChange={(e) => setSecondaryEmail(e.target.value)}
          />
          <Input label="Ciudad" value={city} onChange={(e) => setCity(e.target.value)} />
          <Input label="País" value={country} onChange={(e) => setCountry(e.target.value)} />
          <Input label="Sitio web" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
          <Input
            label="Instagram"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="@cuenta o URL"
          />
        </div>
        <p className="text-xs text-text-muted">Al guardar, debe quedar al menos un teléfono o email.</p>
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/producer/profile')}>
            Cancelar
          </Button>
        </div>
      </form>
    </PageContainer>
  );
}

export function ProducerContactFormLoader() {
  const repos = useRepositories();
  const router = useRouter();
  const { data: profile, isLoading } = useQuery({
    queryKey: producersKeys.myProfile(),
    queryFn: () => repos.producers.getMyProfile(),
  });

  if (isLoading) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }
  if (!profile) {
    router.replace('/producer/profile');
    return null;
  }
  return <ProducerContactForm profile={profile} />;
}
