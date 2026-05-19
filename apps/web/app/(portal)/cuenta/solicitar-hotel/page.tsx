'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileHotelApplySchema } from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Card, CardContent, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';

function withHttpScheme(url: string): string {
  const t = url.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

export default function SolicitarHotelPage() {
  const repos = useRepositories();
  const router = useRouter();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [starCategory, setStarCategory] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [tripadvisor, setTripadvisor] = useState('');
  const [otherSocial, setOtherSocial] = useState('');

  const mutation = useMutation({
    mutationFn: (body: Parameters<typeof repos.profiles.applyHotel>[0]) => repos.profiles.applyHotel(body),
    onSuccess: (data) => {
      addToast(data.message ?? 'Solicitud enviada', 'success');
      queryClient.invalidateQueries({ queryKey: ['me'] });
      router.push('/profiles');
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const stars =
      starCategory.trim() === '' ? undefined : Number.parseInt(starCategory, 10);
    const socialTrim = {
      instagram: instagram.trim() || undefined,
      facebook: facebook.trim() || undefined,
      tripadvisor: tripadvisor.trim() || undefined,
      other: otherSocial.trim() || undefined,
    };
    const hasSocial = Object.values(socialTrim).some(Boolean);

    const raw = {
      displayName: displayName.trim(),
      legalName: legalName.trim() || undefined,
      description: description.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      starCategory: Number.isFinite(stars) ? stars : undefined,
      contactPhone: contactPhone.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      websiteUrl: withHttpScheme(websiteUrl),
      bookingUrl: bookingUrl.trim() ? withHttpScheme(bookingUrl) : undefined,
      socialLinks: hasSocial ? socialTrim : undefined,
    };

    const parsed = profileHotelApplySchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? 'Revisá los datos del formulario';
      addToast(msg, 'error');
      return;
    }

    mutation.mutate(parsed.data);
  };

  return (
    <PageContainer>
      <Link href="/profiles" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Volver a perfiles
      </Link>
      <SectionTitle>Solicitar perfil hotel / alojamiento</SectionTitle>
      <p className="mt-2 text-text-muted">
        El sitio web del establecimiento es obligatorio (con <code className="text-xs">https://</code> o{' '}
        <code className="text-xs">http://</code>). Un administrador revisará tu solicitud.
      </p>
      <Card className="mt-6">
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-text">
                Nombre del establecimiento *
              </label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej: Hotel Plaza"
                required
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="legalName" className="block text-sm font-medium text-text">
                Razón social (opcional)
              </label>
              <Input
                id="legalName"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="websiteUrl" className="block text-sm font-medium text-text">
                Sitio web *
              </label>
              <Input
                id="websiteUrl"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://www.mihotel.com"
                required
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="bookingUrl" className="block text-sm font-medium text-text">
                Motor de reservas / booking (opcional)
              </label>
              <Input
                id="bookingUrl"
                value={bookingUrl}
                onChange={(e) => setBookingUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-text">
                  Ciudad (opcional)
                </label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label htmlFor="starCategory" className="block text-sm font-medium text-text">
                  Categoría estrellas (1–5, opcional)
                </label>
                <select
                  id="starCategory"
                  value={starCategory}
                  onChange={(e) => setStarCategory(e.target.value)}
                  className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-text focus:border-accent focus:outline-none"
                >
                  <option value="">—</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={String(n)}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-text">
                Dirección (opcional)
              </label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="contactPhone" className="block text-sm font-medium text-text">
                  Teléfono de contacto (opcional)
                </label>
                <Input
                  id="contactPhone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label htmlFor="contactEmail" className="block text-sm font-medium text-text">
                  Email de contacto (opcional)
                </label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-text">Redes (opcional)</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Instagram"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                />
                <Input
                  placeholder="Facebook"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                />
                <Input
                  placeholder="TripAdvisor"
                  value={tripadvisor}
                  onChange={(e) => setTripadvisor(e.target.value)}
                />
                <Input
                  placeholder="Otro"
                  value={otherSocial}
                  onChange={(e) => setOtherSocial(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-text">
                Descripción (opcional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Enviando…' : 'Enviar solicitud'}
              </Button>
              <Link href="/profiles">
                <Button variant="outline" type="button">
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
