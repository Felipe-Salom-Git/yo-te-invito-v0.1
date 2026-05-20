'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Card, CardContent, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';

export default function SolicitarGastroPage() {
  const repos = useRepositories();
  const router = useRouter();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [description, setDescription] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      repos.profiles.applyGastro({
        displayName: displayName.trim(),
        legalName: legalName.trim() || undefined,
        description: description.trim() || undefined,
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
      addToast('El nombre del local es requerido', 'error');
      return;
    }
    mutation.mutate();
  };

  return (
    <PageContainer>
      <Link href="/profiles" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Volver a perfiles
      </Link>
      <SectionTitle>Crear perfil gastronómico</SectionTitle>
      <p className="mt-2 text-text-muted">
        Activá tu local al instante. Los tickets de descuento siguen requiriendo aprobación de administración.
      </p>
      <Card className="mt-6">
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-text">
                Nombre del local *
              </label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej: Mi Restaurante"
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
                placeholder="Nombre legal del negocio"
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-text">
                Descripción (opcional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve descripción del local"
                rows={3}
                className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Creando…' : 'Crear perfil'}
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
