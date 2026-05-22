'use client';

import Link from 'next/link';

type Props = {
  blockTitle: string;
  description: string;
  hubHref?: string;
};

export function ProducerProfileFormIntro({
  blockTitle,
  description,
  hubHref = '/producer/profile',
}: Props) {
  return (
    <div className="mb-6">
      <Link href={hubHref} className="text-sm text-text-muted hover:text-accent">
        ← Volver al perfil
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-text">{blockTitle}</h1>
      <p className="mt-2 max-w-2xl text-sm text-text-muted">{description}</p>
      <p className="mt-2 text-xs text-text-muted">
        Los cambios se guardan en el servidor al confirmar. Volvé al hub para ver el progreso
        actualizado.
      </p>
    </div>
  );
}
