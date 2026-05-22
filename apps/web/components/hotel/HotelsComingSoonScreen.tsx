'use client';

import Link from 'next/link';
import { PageContainer } from '@/components';
import {
  HOTELS_COMING_SOON_BODY,
  HOTELS_COMING_SOON_TITLE,
} from '@/lib/hotel/hotelsComingSoonCopy';

type Props = {
  /** Compact banner inside another page */
  variant?: 'page' | 'banner';
};

export function HotelsComingSoonScreen({ variant = 'page' }: Props) {
  if (variant === 'banner') {
    return (
      <div
        className="rounded-xl border border-dashed border-amber-500/35 bg-amber-500/5 px-5 py-5"
        role="status"
        aria-label={HOTELS_COMING_SOON_TITLE}
      >
        <p className="text-xs font-bold uppercase tracking-wider text-amber-200/90">Hoteles</p>
        <p className="mt-1 text-lg font-semibold text-text">Próximamente</p>
        <p className="mt-2 max-w-2xl text-sm text-text-muted">{HOTELS_COMING_SOON_BODY}</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/categorias" className="font-medium text-accent hover:underline">
            Ver categorías activas
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
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Vertical</p>
        <h1 className="mt-2 text-2xl font-bold text-text md:text-3xl">{HOTELS_COMING_SOON_TITLE}</h1>
        <p className="mt-4 text-sm leading-relaxed text-text-muted">{HOTELS_COMING_SOON_BODY}</p>
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
