'use client';

import Link from 'next/link';

export function UserReviewerNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-white sm:text-2xl">
        Perfil no disponible
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-text-muted">
        No encontramos un comentarista público con este identificador, o el perfil
        ya no está disponible.
      </p>
      <Link
        href="/home"
        className="mt-8 inline-flex rounded-lg border border-accent/40 bg-accent/10 px-5 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
