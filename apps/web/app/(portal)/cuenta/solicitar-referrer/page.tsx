'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Card, CardContent, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';

export default function SolicitarReferrerPage() {
  const repos = useRepositories();
  const router = useRouter();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [publicVisibility, setPublicVisibility] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      repos.profiles.applyReferrer({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        city: city.trim() || undefined,
        region: region.trim() || undefined,
        publicVisibility,
      }),
    onSuccess: (data) => {
      addToast(data.message ?? 'Perfil creado', 'success');
      queryClient.invalidateQueries({ queryKey: ['me'] });
      router.push('/referrer');
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      addToast('El nombre público es obligatorio', 'error');
      return;
    }
    mutation.mutate();
  };

  return (
    <PageContainer>
      <Link href="/profiles" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Volver a perfiles
      </Link>
      <SectionTitle>Convertirme en referidor</SectionTitle>
      <p className="mt-2 max-w-2xl text-text-muted">
        Tu perfil queda activo al instante. La URL pública y el @handle los genera la plataforma a partir de tu nombre.
        Podés aparecer en el directorio si activás la visibilidad.
      </p>
      <Card className="mt-6 border-border bg-bg-muted/40">
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-text">
                Nombre público *
              </label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej: Juana — difusión de eventos"
                required
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-text">
                Bio corta (opcional)
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Qué tipo de eventos difundís"
                rows={3}
                className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="avatarUrl" className="block text-sm font-medium text-text">
                URL de avatar (opcional)
              </label>
              <Input
                id="avatarUrl"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://…"
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
                <label htmlFor="region" className="block text-sm font-medium text-text">
                  Región (opcional)
                </label>
                <Input id="region" value={region} onChange={(e) => setRegion(e.target.value)} className="mt-1" />
              </div>
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-bg px-3 py-3">
              <input
                type="checkbox"
                checked={publicVisibility}
                onChange={(e) => setPublicVisibility(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent"
              />
              <span>
                <span className="font-medium text-text">Visible en el directorio de referidores</span>
                <span className="mt-1 block text-sm text-text-muted">
                  Las productoras pueden encontrarte en /referrers.
                </span>
              </span>
            </label>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Creando…' : 'Activar mi perfil'}
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
