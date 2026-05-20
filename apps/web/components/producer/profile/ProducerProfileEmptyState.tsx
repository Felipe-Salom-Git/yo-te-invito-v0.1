import Link from 'next/link';

export function ProducerProfileEmptyState() {
  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-2xl border border-border/80 bg-bg-muted/50 p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-accent-muted/40 bg-bg text-2xl text-accent-soft">
          ◆
        </div>
        <h2 className="mt-6 text-xl font-semibold tracking-tight text-text">
          Creá el perfil público de tu productora
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">
          Mostrá tu marca, tus eventos, tus imágenes y tus datos de contacto en una página propia.
        </p>
        <ul className="mt-6 space-y-2 rounded-xl border border-border/60 bg-bg/50 px-4 py-4 text-left text-sm text-text-muted">
          <li className="flex gap-2">
            <span className="text-accent-soft">✓</span>
            Mostrar todos tus eventos en una página propia.
          </li>
          <li className="flex gap-2">
            <span className="text-accent-soft">✓</span>
            Agregar logo, cabecera y galería.
          </li>
          <li className="flex gap-2">
            <span className="text-accent-soft">✓</span>
            Mostrar teléfono, mail y enlaces.
          </li>
          <li className="flex gap-2">
            <span className="text-accent-soft">✓</span>
            Mejorar la confianza de quienes ven tus eventos.
          </li>
        </ul>
        <Link
          href="/producer/profile/create"
          className="mt-8 inline-flex items-center justify-center rounded border border-transparent bg-accent px-6 py-3 text-base font-medium text-bg transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent-muted focus:ring-offset-2 focus:ring-offset-bg"
        >
          Crear perfil de productora
        </Link>
      </div>
    </div>
  );
}
