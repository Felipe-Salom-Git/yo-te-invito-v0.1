'use client';

import Link from 'next/link';

export function HotelPublicDetailLoading() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="animate-pulse">
        <div className="h-[40vh] min-h-[280px] bg-bg-muted md:min-h-[400px]" />
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-8 sm:px-6 md:px-8">
          <div className="h-4 w-48 rounded bg-bg-muted" />
          <div className="h-8 w-3/4 max-w-lg rounded bg-bg-muted" />
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.65fr,1fr]">
            <div className="h-48 rounded-xl bg-bg-muted" />
            <div className="h-56 rounded-xl bg-bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HotelPublicDetailError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 py-16 text-center">
      <p className="text-lg font-semibold text-text">Alojamiento no encontrado</p>
      <p className="mt-2 max-w-md text-sm text-text-muted">
        Este hotel no está publicado o el enlace ya no es válido.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/hoteles"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg hover:opacity-90"
        >
          Ver hoteles
        </Link>
        <Link
          href="/home"
          className="rounded-lg border border-border px-4 py-2 text-sm text-text hover:border-accent/50"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
