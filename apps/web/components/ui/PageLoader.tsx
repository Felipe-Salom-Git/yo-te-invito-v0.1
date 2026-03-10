/**
 * Consistent loading state for list/detail pages.
 */

export function PageLoader({ message = 'Cargando…' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12" data-testid="page-loader">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" role="status" aria-label="Cargando" />
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  );
}
