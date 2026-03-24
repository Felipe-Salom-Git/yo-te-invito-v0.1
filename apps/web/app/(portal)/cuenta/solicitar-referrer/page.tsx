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
  const [publicHandle, setPublicHandle] = useState('');
  const [bio, setBio] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      repos.profiles.applyReferrer({
        displayName: displayName.trim(),
        publicHandle: publicHandle.trim() || undefined,
        bio: bio.trim() || undefined,
      }),
    onSuccess: (data) => {
      addToast(data.message ?? 'Solicitud enviada', 'success');
      queryClient.invalidateQueries({ queryKey: ['me'] });
      router.push('/profiles');
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      addToast('El nombre de display es requerido', 'error');
      return;
    }
    mutation.mutate();
  };

  return (
    <PageContainer>
      <Link href="/profiles" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Volver a perfiles
      </Link>
      <SectionTitle>Solicitar perfil de referidor</SectionTitle>
      <p className="mt-2 text-text-muted">
        Completá el formulario para solicitar un perfil de referidor. Un administrador revisará tu solicitud.
      </p>
      <Card className="mt-6">
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-text">
                Nombre o alias *
              </label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej: Mi Nombre"
                required
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="publicHandle" className="block text-sm font-medium text-text">
                Handle público (opcional)
              </label>
              <Input
                id="publicHandle"
                value={publicHandle}
                onChange={(e) => setPublicHandle(e.target.value)}
                placeholder="Ej: @mihandle"
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-text">
                Bio (opcional)
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Breve descripción"
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
