'use client';

type Props = {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function ReviewPagination({
  page,
  total,
  pageSize,
  onPageChange,
  className = '',
}: Props) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  return (
    <nav
      className={`mt-6 flex flex-wrap items-center justify-between gap-3 ${className}`}
      aria-label="Paginación de valoraciones"
    >
      <p className="text-xs text-text-muted">
        Página {page} de {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-lg border border-border bg-bg-muted px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page * pageSize >= total}
          className="rounded-lg border border-border bg-bg-muted px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </nav>
  );
}
