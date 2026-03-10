export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-border ${className}`}
      aria-hidden
    />
  );
}

export function EventCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-bg-muted p-4">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/2" />
    </div>
  );
}

export function TicketCardSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-bg-muted p-4">
      <div>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-3 w-24" />
      </div>
      <Skeleton className="h-6 w-16 rounded" />
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-bg-muted p-4">
      <div className="flex justify-between">
        <div>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-2 h-3 w-32" />
        </div>
        <Skeleton className="h-6 w-16 rounded" />
      </div>
    </div>
  );
}
