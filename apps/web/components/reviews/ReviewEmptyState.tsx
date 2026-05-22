'use client';

export type ReviewEmptyVariant = 'none' | 'no-public' | 'unavailable';

const COPY: Record<
  ReviewEmptyVariant,
  { message: string; submessage: string }
> = {
  none: {
    message: 'Todavía no hay valoraciones',
    submessage: 'Sé la primera persona en contar su experiencia',
  },
  'no-public': {
    message: 'No hay valoraciones públicas visibles',
    submessage:
      'Puede haber reseñas en moderación o pendientes de publicación',
  },
  unavailable: {
    message: 'Valoraciones no disponibles',
    submessage: 'No pudimos mostrar las reseñas en este momento',
  },
};

export interface ReviewEmptyStateProps {
  variant?: ReviewEmptyVariant;
  message?: string;
  submessage?: string;
}

export function ReviewEmptyState({
  variant = 'none',
  message,
  submessage,
}: ReviewEmptyStateProps) {
  const copy = COPY[variant];

  return (
    <div className="rounded-xl border border-dashed border-border/80 bg-bg-muted/30 px-6 py-10 text-center sm:py-12">
      <p className="text-base font-medium text-white sm:text-lg">
        {message ?? copy.message}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-muted">
        {submessage ?? copy.submessage}
      </p>
    </div>
  );
}
