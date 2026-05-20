'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { producersKeys } from '@/lib/query/keys';
import { PageContainer, Button, Input, useToast, SectionTitle } from '@/components';
import { getErrorMessage } from '@/lib/errors';

export function ProducerProfileCreatePage() {
  const repos = useRepositories();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [slug, setSlug] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      repos.producers.createMyProfile({
        displayName: displayName.trim(),
        ...(slug.trim().length >= 2 ? { slug: slug.trim() } : {}),
      }),
    onSuccess: () => {
      addToast('Perfil creado', 'success');
      queryClient.invalidateQueries({ queryKey: producersKeys.myProfile() });
      router.push('/producer/profile');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  return (
    <PageContainer className="max-w-lg">
      <Link href="/producer/profile" className="text-sm text-text-muted hover:text-accent">
        ← Volver
      </Link>
      <SectionTitle className="mt-4">Crear perfil de productora</SectionTitle>
      <p className="mt-2 text-sm text-text-muted">
        Empezá con un nombre público. Después podés completar identidad, imágenes y contacto por
        secciones.
      </p>
      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!displayName.trim()) {
            addToast('El nombre es obligatorio', 'error');
            return;
          }
          mutation.mutate();
        }}
      >
        <Input
          label="Nombre de tu productora"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          placeholder="Ej. Fiestas Bresh"
        />
        <Input
          label="Slug opcional"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="URL amigable (mín. 2 caracteres)"
        />
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creando…' : 'Crear perfil de productora'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/producer/profile')}>
            Cancelar
          </Button>
        </div>
      </form>
    </PageContainer>
  );
}
