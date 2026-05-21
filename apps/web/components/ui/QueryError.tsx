'use client';

import { Button } from './Button';

type Props = {
  message: string;
  onRetry?: () => void;
  className?: string;
};

/** Inline error for portal list/detail pages (dark premium). */
export function QueryError({ message, onRetry, className = '' }: Props) {
  return (
    <div
      className={`rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-6 text-center ${className}`}
      role="alert"
    >
      <p className="text-sm text-red-300">{message}</p>
      {onRetry && (
        <Button type="button" size="sm" variant="outline" className="mt-4" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}
