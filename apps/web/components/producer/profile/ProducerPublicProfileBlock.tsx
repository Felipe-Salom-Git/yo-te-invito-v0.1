'use client';

import Link from 'next/link';
import { Button, useToast } from '@/components';
import type { ProducerDetail } from '@/repositories/interfaces';
import { getProducerPublicPath } from '@/lib/producer/public-path';
import { ProducerProfileBlockCard } from './ProducerProfileBlockCard';

type Props = { profile: ProducerDetail };

export function ProducerPublicProfileBlock({ profile }: Props) {
  const { addToast } = useToast();
  const path = getProducerPublicPath(profile);

  const copy = async () => {
    const abs =
      typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
    try {
      await navigator.clipboard.writeText(abs);
      addToast('Enlace copiado', 'success');
    } catch {
      addToast('No se pudo copiar', 'error');
    }
  };

  return (
    <ProducerProfileBlockCard
      icon={<span aria-hidden>↗</span>}
      title="Vista pública"
      description="Revisá cómo ven los usuarios tu página pública."
      footer={
        <div className="flex flex-wrap gap-2">
          <Link
            href={path}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded border border-accent-muted bg-accent-surface/80 px-3 py-1.5 text-sm font-medium text-accent-soft hover:bg-accent-surface"
          >
            Ver perfil público
          </Link>
          <Button variant="outline" size="sm" type="button" onClick={copy}>
            Copiar enlace
          </Button>
        </div>
      }
    >
      <p className="font-mono text-xs text-text-muted">{path}</p>
      <p className="mt-2 text-xs text-text-muted">
        Estado: perfil {profile.status === 'ACTIVE' ? 'activo' : profile.status ?? '—'} · visible en la ruta de arriba
      </p>
    </ProducerProfileBlockCard>
  );
}
