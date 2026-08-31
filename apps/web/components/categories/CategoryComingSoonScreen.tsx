'use client';

import Link from 'next/link';
import { PageContainer } from '@/components';
import { EXCURSION_PUBLIC_LABEL } from '@/lib/categories/excursionPublicCopy';

type Props = {
  categoryLabel: string;
  variant?: 'page' | 'banner';
};

export function CategoryComingSoonScreen({ categoryLabel, variant = 'page' }: Props) {
  if (variant === 'banner') {
    return (
      <div
        className="rounded-xl border border-dashed border-white/20 bg-white/[0.03] px-5 py-5"
        role="status"
        aria-label={`${categoryLabel} próximamente`}
      >
        <p className="text-xs font-bold uppercase tracking-wider text-white/70">{categoryLabel}</p>
        <p className="mt-1 text-lg font-semibold text-text">Próximamente</p>
        <p className="mt-2 max-w-2xl text-sm text-text-muted">
          Estamos preparando esta categoría. Mientras tanto explorá rentals y {EXCURSION_PUBLIC_LABEL.toLowerCase()}.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/categorias" className="font-medium text-accent hover:underline">
            Ver categorías
          </Link>
          <Link href="/explore" className="text-text-muted hover:text-text">
            Explorar →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PageContainer>
      <Link href="/home" className="mb-6 inline-block text-sm text-text-muted hover:text-text">
        ← Inicio
      </Link>
      <div className="mx-auto max-w-xl rounded-2xl border border-border/80 bg-bg-muted/50 px-6 py-10 text-center sm:px-10">
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted">{categoryLabel}</p>
        <h1 className="mt-2 text-2xl font-bold text-text md:text-3xl">Próximamente</h1>
        <p className="mt-4 text-sm leading-relaxed text-text-muted">
          Esta categoría todavía no está disponible para el público. Pronto vas a poder descubrirla
          acá.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/categorias"
            className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-bg hover:bg-accent-hover"
          >
            Elegir categoría
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text hover:border-accent/40"
          >
            Explorar contenido
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
