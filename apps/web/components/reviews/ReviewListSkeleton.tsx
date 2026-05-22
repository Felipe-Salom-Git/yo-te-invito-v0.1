'use client';

import { Skeleton } from '@/components/ui/Skeleton';

export function ReviewListSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="mt-6 space-y-4" aria-busy="true" aria-label="Cargando valoraciones">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border/80 bg-bg-muted/40 p-5"
        >
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-8 w-14 rounded-lg" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-4/5" />
        </div>
      ))}
    </div>
  );
}
