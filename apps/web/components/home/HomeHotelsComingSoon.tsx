'use client';

import Link from 'next/link';

/** Secondary block — hotels exist in the system but are not primary discovery. */
export function HomeHotelsComingSoon() {
  return (
    <section
      className="mx-4 mt-12 scroll-mt-24 rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-5 py-6 sm:mx-6 lg:mx-8"
      aria-label="Hoteles próximamente"
    >
      <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Hoteles</p>
      <h2 className="mt-1 text-lg font-semibold text-white">Próximamente</h2>
      <p className="mt-2 max-w-xl text-sm text-text-muted">
        Estamos preparando alojamiento en Bariloche. Mientras tanto, explorá eventos, gastronomía,
        equipos y excursiones.
      </p>
      <Link
        href="/explore"
        className="mt-4 inline-block text-sm font-medium text-accent hover:text-white"
      >
        Ir a explorar →
      </Link>
    </section>
  );
}
